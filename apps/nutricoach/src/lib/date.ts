/** Fecha local en formato YYYY-MM-DD (clave de food_logs). */
export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Etiqueta amigable de un día (Hoy / Ayer / fecha local). */
export function dayLabel(dateISO: string): string {
  const today = todayISO();
  const yesterday = todayISO(new Date(Date.now() - 86_400_000));
  if (dateISO === today) return "Hoy";
  if (dateISO === yesterday) return "Ayer";
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString();
}

/**
 * Timestamp ISO para registrar en un día concreto: hoy → ahora (undefined),
 * días pasados → mediodía local de esa fecha (cae siempre dentro del día).
 */
export function timestampForDay(dateISO: string): string | undefined {
  if (dateISO === todayISO()) return undefined;
  return new Date(`${dateISO}T12:00:00`).toISOString();
}

/** Edad en años a partir de una fecha ISO de nacimiento. */
export function ageFromBirthDate(iso: string | null): number | null {
  if (!iso) return null;
  const b = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
