// Edge Function: send-reminders — corre en CRON y envía Web Push a los usuarios
// cuya hora local de recordatorio coincide con esta ejecución, con los faltantes
// del día. Requisitos (secretos): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hola@titoapps.com";

const WINDOW_MIN = 15; // debe coincidir con la frecuencia del cron

function nowInTz(tz: string): { date: string; minutes: number } {
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(now).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  let hh = parseInt(parts.hour);
  if (hh === 24) hh = 0;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: hh * 60 + parseInt(parts.minute) };
}

function dayStartUTC(dateStr: string, tz: string): string {
  const guess = new Date(`${dateStr}T00:00:00Z`).getTime();
  const local = new Date(new Date(guess).toLocaleString("en-US", { timeZone: tz })).getTime();
  return new Date(guess + (guess - local)).toISOString();
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function buildMessage(cfg: any, consumed: any, goal: any, waterMl: number): string | null {
  const parts: string[] = [];
  if (cfg.reminder_water && goal?.water_ml) {
    const rem = Math.round(goal.water_ml - waterMl);
    if (rem > 100) parts.push(`${rem} ml de agua`);
  }
  if (cfg.reminder_protein && goal) {
    const rem = Math.round(goal.protein_g - consumed.protein_g);
    if (rem > 5) parts.push(`${rem} g de proteína`);
  }
  if (cfg.reminder_calories && goal) {
    const rem = Math.round(goal.calorie_target - consumed.kcal);
    if (rem > 50) parts.push(`${rem} kcal`);
  }
  if (parts.length === 0) return null;
  return `Te faltan ${parts.join(", ")} para tu objetivo de hoy. ¡Dale un empujón! 💪`;
}

Deno.serve(async () => {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { data: profiles, error } = await db
    .from("profiles")
    .select("user_id, reminder_time, reminder_water, reminder_protein, reminder_calories, reminder_tz, reminder_last_sent")
    .eq("reminder_enabled", true);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let sent = 0;
  for (const cfg of profiles ?? []) {
    const tz = cfg.reminder_tz || "America/Costa_Rica";
    const { date, minutes } = nowInTz(tz);
    const remMin = toMinutes(cfg.reminder_time || "18:00");
    const diff = minutes - remMin;
    if (diff < 0 || diff >= WINDOW_MIN) continue; // no es su ventana
    if (cfg.reminder_last_sent === date) continue; // ya se le envió hoy

    // Consumo del día (calorías/proteína desde food_logs por fecha local).
    const { data: logs } = await db
      .from("food_logs")
      .select("log_items(kcal,protein_g)")
      .eq("user_id", cfg.user_id)
      .eq("log_date", date);
    const consumed = (logs ?? []).flatMap((l: any) => l.log_items ?? []).reduce(
      (a: any, it: any) => ({ kcal: a.kcal + (it.kcal || 0), protein_g: a.protein_g + (it.protein_g || 0) }),
      { kcal: 0, protein_g: 0 },
    );

    // Agua del día (por ventana de tiempo en su zona).
    const { data: waters } = await db
      .from("water_logs")
      .select("ml")
      .eq("user_id", cfg.user_id)
      .gte("logged_at", dayStartUTC(date, tz));
    const waterMl = (waters ?? []).reduce((a: number, w: any) => a + (w.ml || 0), 0);

    const { data: goal } = await db
      .from("goals")
      .select("calorie_target, protein_g, water_ml")
      .eq("user_id", cfg.user_id)
      .eq("is_active", true)
      .maybeSingle();

    const message = buildMessage(cfg, consumed, goal, waterMl);
    // Marcar como enviado hoy aunque no haya faltantes (para no reintentar en la ventana).
    await db.from("profiles").update({ reminder_last_sent: date }).eq("user_id", cfg.user_id);
    if (!message) continue;

    const { data: subs } = await db
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", cfg.user_id);

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: "NutriCoach", body: message, url: "/" }),
        );
        sent++;
      } catch (e: any) {
        // Suscripción vencida/inválida → limpiarla.
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), { headers: { "Content-Type": "application/json" } });
});
