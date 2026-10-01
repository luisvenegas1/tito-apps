/** Mensaje entendible a partir de un error de Supabase/red. */
export function errorMessage(e: unknown): string {
  const raw =
    e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) return "Sin conexión. Revisa tu internet e inténtalo de nuevo.";
  if (/Invalid login credentials/i.test(raw)) return "Correo o contraseña incorrectos.";
  if (/User already registered/i.test(raw)) return "Ese correo ya tiene cuenta. Entra con tu contraseña.";
  if (/Password should be/i.test(raw)) return "La contraseña debe tener al menos 6 caracteres.";
  if (/duplicate key.*categories_user_name/i.test(raw)) return "Ya tienes una categoría con ese nombre.";
  if (/duplicate key.*shared_entry_id/i.test(raw)) return "Ese cargo ya está en tus gastos.";
  if (/row-level security/i.test(raw)) return "No tienes permiso para hacer eso.";
  return raw;
}

/** Postgres unique_violation: útil para reintentos idempotentes (cola offline). */
export function isDuplicate(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505";
}

/** Lanza el error de una respuesta de Supabase. */
export function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}
