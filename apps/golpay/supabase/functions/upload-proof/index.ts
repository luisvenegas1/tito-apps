// Edge Function: emite una SIGNED UPLOAD URL para el comprobante de pago.
// Seguridad:
//  - Valida que el jugador pertenezca al partido del token antes de emitir la URL.
//  - Ruta aleatoria "<match_id>/<uuid>.<ext>"; nunca escritura anónima amplia.
//  - Solo JPEG/PNG/WebP; el bucket es privado y limita tamaño.
//  - service_role SOLO acá (inyectado por Supabase), nunca en el frontend.
//  - Logs seguros (sin tokens).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "payment-proofs";
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function bad(status = 400, msg = "Solicitud inválida"): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return bad(405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return bad(); }
  const token = body.token, matchPlayerId = body.matchPlayerId, contentType = body.contentType;
  if (
    typeof token !== "string" ||
    typeof matchPlayerId !== "string" || typeof contentType !== "string" ||
    !EXT[contentType]
  ) return bad(400, "Datos inválidos o tipo de archivo no permitido");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) El token existe y el jugador pertenece a ESE partido (una sola consulta).
  const { data: matchId } = await admin.rpc("verify_match_player", {
    p_token: token, p_match_player_id: matchPlayerId,
  });
  if (!matchId) return bad(403, "Jugador no pertenece al partido");

  // 2) Ruta aleatoria + signed upload URL.
  const path = `${matchId}/${crypto.randomUUID()}.${EXT[contentType as string]}`;
  const { data: signed, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !signed) { console.log("proof signurl fail"); return bad(500, "No se pudo preparar la subida"); }

  console.log(`proof url ok match=${String(matchId).slice(0, 8)}`);
  return new Response(JSON.stringify({ path, token: signed.token, signedUrl: signed.signedUrl }), {
    status: 200, headers: { ...cors, "Content-Type": "application/json" },
  });
});
