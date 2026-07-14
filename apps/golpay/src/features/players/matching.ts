import type { FrequentPlayer } from "@/lib/supabase/types";

/**
 * Lógica PURA de emparejamiento de jugadores (sin Supabase), para poder testearla.
 */

/** Devuelve un jugador ACTIVO con el mismo nombre (para evitar duplicados). */
export function findDuplicate(
  name: string,
  list: FrequentPlayer[],
  excludeId?: string,
): FrequentPlayer | null {
  const n = name.toLowerCase().trim();
  return (
    list.find(
      (f) => f.is_active && f.id !== excludeId && f.name.toLowerCase().trim() === n,
    ) ?? null
  );
}

/**
 * Sugiere posibles coincidencias entre un nombre importado y jugadores frecuentes
 * ACTIVOS. NO fusiona: sólo sugiere. La UI confirma.
 */
export function suggestMatches(name: string, frequent: FrequentPlayer[]): FrequentPlayer[] {
  const n = name.toLowerCase().trim();
  return frequent.filter((f) => {
    if (!f.is_active) return false;
    const fn = f.name.toLowerCase();
    const nick = (f.nickname ?? "").toLowerCase();
    return (
      fn === n ||
      nick === n ||
      fn.startsWith(n) ||
      n.startsWith(fn) ||
      (fn.split(" ")[0] === n.split(" ")[0] && n.length > 2)
    );
  });
}
