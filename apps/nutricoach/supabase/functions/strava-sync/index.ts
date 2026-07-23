// Edge Function: strava-sync — trae los entrenamientos recientes del usuario
// desde Strava y los guarda como workouts (con calorías), evitando duplicados.
// Refresca el token si venció. Requiere STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;

const MET: Record<string, number> = {
  walking: 3.5, running: 9.8, cycling: 7.5, swimming: 8, strength: 6,
  hiit: 8.5, yoga: 3, elliptical: 5, rowing: 7, other: 4,
};

function normalizeType(raw: string): string {
  const s = (raw || "").toLowerCase();
  if (/run|jog|treadmill/.test(s)) return "running";
  if (/walk|hik/.test(s)) return "walking";
  if (/ride|cycl|bike|spinning/.test(s)) return "cycling";
  if (/swim/.test(s)) return "swimming";
  if (/weight|strength|workout/.test(s)) return "strength";
  if (/hiit|interval/.test(s)) return "hiit";
  if (/yoga|pilates/.test(s)) return "yoga";
  if (/elliptical/.test(s)) return "elliptical";
  if (/row/.test(s)) return "rowing";
  return "other";
}

function estimateCalories(type: string, minutes: number, weightKg: number): number {
  const met = MET[type] ?? 4;
  return Math.round(((met * 3.5 * weightKg) / 200) * minutes);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data: userData, error: uerr } = await admin.auth.getUser(jwt);
    if (uerr || !userData.user) return json({ error: "No autenticado" }, 401);
    const userId = userData.user.id;

    const { data: conn } = await admin
      .from("strava_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!conn) return json({ error: "No hay conexión con Strava" }, 400);

    // Refrescar token si venció (margen de 60s).
    let accessToken = conn.access_token as string;
    if (new Date(conn.expires_at).getTime() - Date.now() < 60_000) {
      const r = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: conn.refresh_token,
        }),
      });
      if (!r.ok) return json({ error: `Strava refresh ${r.status}` }, 400);
      const nt = await r.json();
      accessToken = nt.access_token;
      await admin
        .from("strava_connections")
        .update({
          access_token: nt.access_token,
          refresh_token: nt.refresh_token,
          expires_at: new Date(nt.expires_at * 1000).toISOString(),
        })
        .eq("user_id", userId);
    }

    // Peso del usuario para estimar calorías cuando Strava no las trae.
    const { data: w } = await admin
      .from("weight_logs")
      .select("weight_kg")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const weightKg = (w?.weight_kg as number) ?? 70;

    // Actividades de los últimos 30 días.
    const after = Math.floor((Date.now() - 30 * 86_400_000) / 1000);
    const listRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!listRes.ok) return json({ error: `Strava ${listRes.status}: ${await listRes.text()}` }, 400);
    const activities: any[] = await listRes.json();

    // Dedupe contra lo ya importado.
    const { data: existing } = await admin
      .from("workouts")
      .select("external_id")
      .eq("user_id", userId)
      .eq("source", "strava");
    const seen = new Set((existing ?? []).map((e: any) => e.external_id));
    const fresh = activities.filter((a) => a.id && !seen.has(String(a.id))).slice(0, 30);

    const rows: any[] = [];
    for (const a of fresh) {
      const type = normalizeType(a.sport_type ?? a.type ?? "");
      const durationMin = Math.round((a.moving_time || a.elapsed_time || 0) / 60);
      // La lista no trae calorías; las pedimos en el detalle. Si no hay, estimamos.
      let kcal = 0;
      try {
        const detRes = await fetch(`https://www.strava.com/api/v3/activities/${a.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (detRes.ok) {
          const det = await detRes.json();
          kcal = Math.round(det.calories ?? 0);
        }
      } catch {
        /* usamos estimación */
      }
      if (!kcal) kcal = estimateCalories(type, durationMin, weightKg);

      rows.push({
        user_id: userId,
        type,
        name: a.name ?? null,
        duration_min: durationMin,
        kcal_burned: kcal,
        source: "strava",
        external_id: String(a.id),
        performed_at: a.start_date ?? new Date().toISOString(),
      });
    }

    let imported = 0;
    if (rows.length > 0) {
      const { error: insErr, count } = await admin.from("workouts").insert(rows, { count: "exact" });
      if (insErr) return json({ error: insErr.message }, 500);
      imported = count ?? rows.length;
    }

    await admin.from("strava_connections").update({ last_synced_at: new Date().toISOString() }).eq("user_id", userId);
    return json({ ok: true, imported });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});
