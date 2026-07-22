/**
 * Reglas de username (deben coincidir con la BD en 0002_username.sql).
 * 3–24, letras/números/guion/guion bajo, sin espacios, sin palabras reservadas.
 * Unicidad case-insensitive la garantiza la BD (índice único lower(username)).
 */
export const RESERVED_USERNAMES = [
  "admin", "support", "nutricoach", "titoapps", "api", "login", "root", "help",
  "www", "contact", "settings", "account", "soporte", "ayuda",
];

const USERNAME_RE = /^[A-Za-z0-9_-]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface UsernameCheck {
  ok: boolean;
  error?: string;
}

/** ¿El texto parece un email? (para decidir login directo vs Edge Function). */
export function looksLikeEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Valida el formato de un username. La disponibilidad se consulta aparte. */
export function validateUsername(raw: string): UsernameCheck {
  const u = raw.trim();
  if (u.length < 3) return { ok: false, error: "Mínimo 3 caracteres." };
  if (u.length > 24) return { ok: false, error: "Máximo 24 caracteres." };
  if (/\s/.test(u)) return { ok: false, error: "Sin espacios." };
  if (!USERNAME_RE.test(u)) return { ok: false, error: "Solo letras, números, - y _." };
  if (RESERVED_USERNAMES.includes(u.toLowerCase())) return { ok: false, error: "Ese usuario está reservado." };
  return { ok: true };
}
