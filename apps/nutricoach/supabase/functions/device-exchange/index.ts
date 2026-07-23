// Edge Function: device-exchange — canjea el "code" de OAuth por tokens de un
// proveedor (fitbit | oura) y los guarda en device_connections.
// Secretos: FITBIT_CLIENT_ID/SECRET, OURA_CLIENT_ID/SECRET.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { exchangeCode, type Provider } from "../_shared/devices.ts";

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

    const { provider, code, redirect_uri } = await req.json();
    if (!provider || !code || !redirect_uri) return json({ error: "Faltan datos" }, 400);
    if (provider !== "fitbit" && provider !== "oura") return json({ error: "Proveedor no soportado" }, 400);

    const t = await exchangeCode(provider as Provider, code, redirect_uri);
    const { error } = await admin.from("device_connections").upsert(
      {
        user_id: userId,
        provider,
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        expires_at: t.expires_at,
        external_user_id: t.external_user_id,
      },
      { onConflict: "user_id,provider" },
    );
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});
