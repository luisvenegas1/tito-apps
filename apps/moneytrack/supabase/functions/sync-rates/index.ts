// Edge Function: sync-rates — guarda el tipo de cambio de referencia del BCCR
// en la tabla GLOBAL reference_rates, una vez por día para todos los usuarios.
//
// - Si hoy ya se consultó (reference_sync_days), responde sin llamar a la API.
// - La llaman pg_cron (temprano cada día, con CRON_SECRET) y la app, solo
//   cuando no encuentra el de hoy en la base: el primero que entra lo trae.
// Los usuarios no pueden escribir reference_rates: solo esta función (service_role).
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BCCR_URL, parseHacienda, todayInCostaRica } from "./parse.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

/** Solo pg_cron (CRON_SECRET) o un usuario con sesión. */
async function authorized(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization") ?? "";
  if (CRON_SECRET && auth === `Bearer ${CRON_SECRET}`) return true;
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data } = await userClient.auth.getUser(token);
  return Boolean(data.user);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!(await authorized(req))) return json({ error: "No autorizado" }, 401);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const today = todayInCostaRica();

  // 1) ¿Ya se consultó hoy? Entonces no se llama a la API.
  const { data: done } = await db.from("reference_sync_days").select("day").eq("day", today).maybeSingle();
  if (done) return json({ status: "cached", day: today });

  // 2) Consultar Hacienda (BCCR) y guardar. upsert: si dos usuarios entran a la vez, no se duplica.
  let rows;
  try {
    const res = await fetch(BCCR_URL);
    if (!res.ok) return json({ error: `Hacienda respondió ${res.status}` }, 502);
    rows = parseHacienda(await res.json(), today);
  } catch (e) {
    return json({ error: `No se pudo consultar Hacienda: ${(e as Error).message}` }, 502);
  }
  if (rows.length === 0) return json({ error: "Respuesta de Hacienda sin tipo de cambio" }, 502);

  const { error } = await db.from("reference_rates").upsert(rows, { onConflict: "currency,rate_date" });
  if (error) return json({ error: error.message }, 500);
  await db.from("reference_sync_days").upsert({ day: today }, { onConflict: "day" });

  return json({ status: "fetched", day: today, rates: rows });
});
