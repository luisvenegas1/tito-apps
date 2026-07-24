/**
 * Convierte cualquier cosa que llegue por un catch en un texto legible.
 * (No todo lo que Supabase tira tiene `.message`.)
 */

const TRANSLATIONS: Array<[RegExp, string]> = [
  [
    /error sending confirmation email/i,
    "La cuenta no se pudo crear porque falló el envío del correo de confirmación. " +
      "Es un problema de configuración del servidor de correo, no de tus datos.",
  ],
  [/user already registered|already been registered/i, "Ese correo ya tiene una cuenta."],
  [/invalid login credentials/i, "Usuario o contraseña incorrectos."],
  [/password should be at least/i, "La contraseña es muy corta."],
  [/email rate limit exceeded|over_email_send_rate_limit/i,
    "Se alcanzó el límite de correos por hora. Esperá un rato y volvé a intentar."],
  [/unable to validate email address/i, "Ese correo no parece válido."],
  [/email not confirmed/i, "Falta confirmar el correo. Revisá tu bandeja de entrada."],
  [
    /auth session missing|session missing|session_not_found|otp_expired|invalid or has expired|token has expired|link is invalid/i,
    "Tu enlace de recuperación ya venció o no es válido (quizás pediste uno más nuevo). Pedí un enlace nuevo e intentá otra vez.",
  ],
];

function raw(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;

  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    for (const key of ["message", "error_description", "error", "msg", "hint", "details"]) {
      const v = o[key];
      if (typeof v === "string" && v.trim()) return v;
    }
    try {
      const json = JSON.stringify(err);
      if (json && json !== "{}") return json;
    } catch {
      /* referencias circulares */
    }
  }
  return "";
}

export function errorMessage(err: unknown, fallback = "Algo salió mal. Intentá de nuevo."): string {
  const text = raw(err);
  if (!text) return fallback;
  for (const [re, friendly] of TRANSLATIONS) {
    if (re.test(text)) return friendly;
  }
  return text;
}
