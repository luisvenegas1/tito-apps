// Edge Function: login por USERNAME (resuelve username -> email en el servidor).
// Reglas de seguridad:
//  - Nunca devuelve ni expone el email.
//  - Mensaje genérico siempre: "Usuario o contraseña incorrectos".
//  - Sin enumeración: mismo mensaje y demora uniforme para todos los fallos.
//  - service_role SOLO acá (inyectado por Supabase, nunca en el frontend).
//  - Rate limiting best-effort por IP + identificador.
//  - Logs seguros: sin password, sin email completo, sin tokens, sin service_role.
//
// Payload aceptado ESTRICTAMENTE: { identifier: string, password: string }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GENERIC = "Usuario o contraseña incorrectos";
const MIN_MS = 400; // piso de tiempo para respuestas fallidas (anti-timing)

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rate limiter en memoria (best-effort; el runtime es efímero). Recomendado
// reforzar con un store externo + CAPTCHA tras varios intentos.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW = 15 * 60_000;
const MAX = 8;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now > rec.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW });
    return false;
  }
  rec.count++;
  return rec.count > MAX;
}

function maskId(id: string): string {
  return id.length <= 2 ? "**" : id[0] + "***" + id[id.length - 1];
}

async function fail(startedAt: number, status = 401, captcha = false): Promise<Response> {
  const elapsed = Date.now() - startedAt;
  if (elapsed < MIN_MS) await new Promise((r) => setTimeout(r, MIN_MS - elapsed));
  const body: Record<string, unknown> = { error: GENERIC };
  if (captcha) body.captcha_required = true;
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail(Date.now(), 405);
  const startedAt = Date.now();

  // Validación estricta del payload.
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return fail(startedAt, 400);
  }
  const p = payload as Record<string, unknown>;
  const keys = Object.keys(p ?? {});
  const identifier = p?.identifier;
  const password = p?.password;
  if (
    keys.length !== 2 ||
    typeof identifier !== "string" ||
    typeof password !== "string" ||
    identifier.trim().length < 3 ||
    identifier.length > 254 ||
    password.length < 1 ||
    password.length > 200
  ) {
    return fail(startedAt, 400);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rlKey = `${ip}:${identifier.toLowerCase()}`;
  if (rateLimited(rlKey)) {
    console.log(`login rate-limited ip=${ip} id=${maskId(identifier)}`);
    return fail(startedAt, 429, true);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Resolver username -> user id (case-insensitive), luego email vía admin (NO se devuelve).
  const { data: rows } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", identifier.trim())
    .limit(1);
  const userId = rows?.[0]?.id as string | undefined;
  if (!userId) {
    console.log(`login fail (no-user) ip=${ip} id=${maskId(identifier)}`);
    return fail(startedAt); // genérico, mismo timing
  }

  const { data: userRes } = await admin.auth.admin.getUserById(userId);
  const email = userRes?.user?.email;
  if (!email) return fail(startedAt);

  // Autenticar con un cliente anónimo (no admin). El email nunca sale de acá.
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signIn, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !signIn.session) {
    console.log(`login fail (bad-pass) ip=${ip} id=${maskId(identifier)}`);
    return fail(startedAt);
  }

  console.log(`login ok ip=${ip} id=${maskId(identifier)}`);
  // Solo tokens de sesión; NUNCA email.
  return new Response(
    JSON.stringify({
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
