// Edge Function: device-sync — trae los entrenamientos de un proveedor
// (fitbit | oura), refresca el token si venció, dedupe e inserta workouts.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { fetchWorkouts, refreshToken, type Provider } from "../_shared/devices.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data: userData, error: uerr } = await admin.auth.getUser(jwt);
    if (uerr || !userData.user) return json({ error: "No autenticado" }, 401);
    const userId = userData.user.id;

    const { provider } = await req.json();
    if (provider !== "fitbit" && provider !== "oura") return json({ error: "Proveedor no soportado" }, 400);

    const { data: conn } = await admin
      .from("device_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", provider)
      .maybeSingle();
    if (!conn) return json({ error: "No conectado" }, 400);

    let accessToken = conn.access_token as string;
    if (conn.refresh_token && conn.expires_at && new Date(conn.expires_at).getTime() - Date.now() < 60_000) {
      const t = await refreshToken(provider as Provider, conn.refresh_token);
      accessToken = t.access_token;
      await admin
        .from("device_connections")
        .update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at })
        .eq("user_id", userId)
        .eq("provider", provider);
    }

    const { data: w } = await admin
      .from("weight_logs")
      .select("weight_kg")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const weightKg = (w?.weight_kg as number) ?? 70;

    const incoming = await fetchWorkouts(provider as Provider, accessToken, weightKg);

    const { data: existing } = await admin
      .from("workouts")
      .select("external_id")
      .eq("user_id", userId)
      .eq("source", provider);
    const seen = new Set((existing ?? []).map((e: any) => e.external_id));
    const rows = incoming
      .filter((r) => !seen.has(r.external_id))
      .map((r) => ({ ...r, user_id: userId, source: provider }));

    let imported = 0;
    if (rows.length > 0) {
      const { error: insErr, count } = await admin.from("workouts").insert(rows, { count: "exact" });
      if (insErr) return json({ error: insErr.message }, 500);
      imported = count ?? rows.length;
    }

    await admin
      .from("device_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("provider", provider);
    return json({ ok: true, imported });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});
