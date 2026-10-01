// Edge Function: notify-due — corre por pg_cron (diario). 1) genera las
// instancias de pagos recurrentes, 2) crea los avisos de vencimiento in-app y
// 3) los envía por Web Push a quien activó notificaciones.
// Secretos: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (opcional) y
// CRON_SECRET (lo manda pg_cron en el header Authorization para que nadie más la dispare).
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hola@titoapps.com";

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get("Authorization") !== `Bearer ${CRON_SECRET}`) {
    return new Response("No autorizado", { status: 401 });
  }
  const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // service_role: auth.uid() es nulo, así que genera para todos los usuarios.
  const gen = await db.rpc("generate_scheduled_payments", {});
  const built = await db.rpc("build_due_notifications");
  if (gen.error || built.error) {
    return new Response(JSON.stringify({ error: gen.error?.message ?? built.error?.message }), { status: 500 });
  }

  let sent = 0;
  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    const { data: pending } = await db
      .from("notifications")
      .select("id, user_id, title, body, url")
      .is("pushed_at", null)
      .is("read_at", null)
      .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());

    const { data: enabled } = await db.from("profiles").select("id").eq("push_enabled", true);
    const pushUsers = new Set((enabled ?? []).map((p: any) => p.id));

    for (const n of pending ?? []) {
      if (pushUsers.has(n.user_id)) {
        const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", n.user_id);
        for (const s of subs ?? []) {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title: n.title, body: n.body ?? "", url: n.url ?? "/" }),
            );
            sent++;
          } catch (e: any) {
            // Suscripción vencida o revocada: se borra para no reintentar.
            if (e?.statusCode === 404 || e?.statusCode === 410) {
              await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
            }
          }
        }
      }
      await db.from("notifications").update({ pushed_at: new Date().toISOString() }).eq("id", n.id);
    }
  }

  return new Response(JSON.stringify({ generated: gen.data, notifications: built.data, pushed: sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
