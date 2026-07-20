import type { FrequentPlayer } from "@/lib/supabase/types";

/**
 * Lógica PURA de emparejamiento de jugadores (sin Supabase), para testearla.
 *
 * Reglas:
 *  - "Tito", "tito" y "TITO" son el mismo (normaliza mayúsculas/acentos/puntos).
 *  - "sebas c" y "sebas castro" son un match PROBABLE (inicial del apellido).
 *  - Solo los match EXACTOS se vinculan solos; los probables piden confirmación.
 */

/** minúsculas, sin acentos, sin puntuación, espacios colapsados. */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[._,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type MatchKind = "exact" | "probable";

export interface PlayerMatch {
  player: FrequentPlayer;
  kind: MatchKind;
}

/** ¿"sebas c" es una forma abreviada de "sebas castro"? */
function isInitialForm(short: string, full: string): boolean {
  const a = short.split(" ");
  const b = full.split(" ");
  if (a.length < 2 || b.length < 2) return false;
  if (a[0] !== b[0]) return false;
  const initial = a[a.length - 1];
  const surname = b[b.length - 1];
  return initial.length === 1 && surname.startsWith(initial);
}

/** Devuelve coincidencias con su tipo (exactas primero). */
export function findMatches(name: string, list: FrequentPlayer[]): PlayerMatch[] {
  const n = normalizeName(name);
  if (!n) return [];
  const out: PlayerMatch[] = [];

  for (const f of list) {
    if (!f.is_active) continue;
    const fn = normalizeName(f.name);
    const nick = normalizeName(f.nickname ?? "");

    if (fn === n || (nick !== "" && nick === n)) {
      out.push({ player: f, kind: "exact" });
      continue;
    }

    const firstA = n.split(" ")[0];
    const firstB = fn.split(" ")[0];
    const probable =
      fn.startsWith(n + " ") || n.startsWith(fn + " ") || // "sebas" ↔ "sebas castro"
      isInitialForm(n, fn) || isInitialForm(fn, n) ||      // "sebas c" ↔ "sebas castro"
      (firstA === firstB && firstA.length > 2) ||          // mismo nombre de pila
      (nick !== "" && nick.length > 2 && (nick.startsWith(n) || n.startsWith(nick)));

    if (probable) out.push({ player: f, kind: "probable" });
  }

  return out.sort((a, b) => (a.kind === "exact" ? 0 : 1) - (b.kind === "exact" ? 0 : 1));
}

/** Compatibilidad: solo la lista de jugadores sugeridos. */
export function suggestMatches(name: string, frequent: FrequentPlayer[]): FrequentPlayer[] {
  return findMatches(name, frequent).map((m) => m.player);
}

/** Devuelve un jugador ACTIVO con el mismo nombre (para evitar duplicados). */
export function findDuplicate(
  name: string,
  list: FrequentPlayer[],
  excludeId?: string,
): FrequentPlayer | null {
  const n = normalizeName(name);
  return list.find((f) => f.is_active && f.id !== excludeId && normalizeName(f.name) === n) ?? null;
}
