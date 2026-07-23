// Edge Function: strava-exchange — canjea el "code" de OAuth por tokens de Strava
// y los guarda en strava_connections (por usuario). Requiere secretos:
//   STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data: userData, error: uerr } = await admin.auth.getUser(jwt);
    if (uerr || !userData.user) return json({ error: "No autenticado" }, 401);
    const userId = userData.user.id;

    const { code } = await req.json();
    if (!code) return json({ error: "Falta el código de autorización" }, 400);

    const res = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) return json({ error: `Strava ${res.status}: ${await res.text()}` }, 400);
    const t = await res.json();

    const { error } = await admin.from("strava_connections").upsert(
      {
        user_id: userId,
        athlete_id: t.athlete?.id ?? null,
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        expires_at: new Date((t.expires_at ?? 0) * 1000).toISOString(),
        scope: null,
      },
      { onConflict: "user_id" },
    );
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, athlete_id: t.athlete?.id ?? null });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});
