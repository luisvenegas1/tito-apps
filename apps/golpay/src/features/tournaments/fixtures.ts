/**
 * Emparejamientos de un minitorneo. Lógica pura (sin Supabase) para testearla.
 *
 * - roundRobin: todos contra todos, una vez cada par. Es la "cuadrangular".
 * - pairKey: identifica un enfrentamiento sin importar el orden, para saber si
 *   A-B ya se jugó aunque se haya cargado como B-A.
 */

export interface Pairing {
  a: string;
  b: string;
}

/** Todos los pares posibles, en orden estable. 4 equipos → 6 juegos. */
export function roundRobin(teamIds: string[]): Pairing[] {
  const out: Pairing[] = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      out.push({ a: teamIds[i], b: teamIds[j] });
    }
  }
  return out;
}

/** Clave del enfrentamiento independiente del orden: A-B === B-A. */
export function pairKey(x: string, y: string): string {
  return [x, y].sort().join("__");
}

/** Cuántos juegos tiene una cuadrangular de N equipos. */
export function totalGames(n: number): number {
  return (n * (n - 1)) / 2;
}
