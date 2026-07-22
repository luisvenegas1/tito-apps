/**
 * Formaciones de fútbol 11 y sugerencia de alineación (lógica pura, testeable).
 *
 * La sugerencia se basa en RESPONSABILIDAD (asistencia/pago) — la idea del
 * grupo: el que más aparece y cumple, juega. La posición del perfil se usa para
 * ubicar a cada quien en su línea; cuando no alcanza, se completa por
 * responsabilidad.
 */

export type Line = "portero" | "defensa" | "medio" | "delantero";

export interface Formation {
  id: string;
  label: string; // "4-4-2"
  defensa: number;
  medio: number;
  delantero: number;
}

/** portero siempre es 1; def+mid+fwd = 10. */
export const FORMATIONS: Formation[] = [
  { id: "442", label: "4-4-2", defensa: 4, medio: 4, delantero: 2 },
  { id: "433", label: "4-3-3", defensa: 4, medio: 3, delantero: 3 },
  { id: "352", label: "3-5-2", defensa: 3, medio: 5, delantero: 2 },
  { id: "451", label: "4-5-1", defensa: 4, medio: 5, delantero: 1 },
  { id: "532", label: "5-3-2", defensa: 5, medio: 3, delantero: 2 },
  { id: "343", label: "3-4-3", defensa: 3, medio: 4, delantero: 3 },
];

export interface LineupPlayer {
  id: string;
  name: string;
  /** Posición del perfil, si la tiene. */
  preferred: Line | null;
  /** 0..100: mezcla de asistencia y pago. Más alto = más responsable. */
  reliability: number;
  canGoalkeeper: boolean;
}

export interface LineupSlot {
  line: Line;
  player: LineupPlayer | null; // null = puesto sin cubrir (faltan jugadores)
}

export interface Lineup {
  slots: LineupSlot[];
  bench: LineupPlayer[];
}

const ORDER: Line[] = ["portero", "defensa", "medio", "delantero"];

/**
 * Arma la alineación sugerida para una formación.
 * 1) Portero: primero quien juega de portero (posición o "puede atajar"), si no
 *    el de menor responsabilidad para no gastar un titular fuerte en el arco…
 *    NO: para torneo el arco importa, así que va el mejor disponible que pueda.
 * 2) Cada línea se llena primero con jugadores cuya posición coincide (por
 *    responsabilidad), y lo que falte con el resto por responsabilidad.
 */
export function suggestLineup(players: LineupPlayer[], f: Formation): Lineup {
  const need: Record<Line, number> = {
    portero: 1, defensa: f.defensa, medio: f.medio, delantero: f.delantero,
  };

  // Más responsable primero; a igualdad, alfabético para que sea estable.
  const byRel = [...players].sort(
    (a, b) => b.reliability - a.reliability || a.name.localeCompare(b.name),
  );

  const used = new Set<string>();
  const slots: LineupSlot[] = [];

  // Portero: prioriza a quien pueda atajar; entre esos, el más responsable.
  const keepers = byRel.filter((p) => p.canGoalkeeper || p.preferred === "portero");
  const gk = keepers[0] ?? null;
  if (gk) used.add(gk.id);
  slots.push({ line: "portero", player: gk });

  for (const line of ["defensa", "medio", "delantero"] as Line[]) {
    const count = need[line];
    // Primero los de esa posición, después cualquiera, siempre por resp.
    const preferred = byRel.filter((p) => !used.has(p.id) && p.preferred === line);
    const rest = byRel.filter((p) => !used.has(p.id) && p.preferred !== line);
    const pool = [...preferred, ...rest];
    for (let i = 0; i < count; i++) {
      const pick = pool.find((p) => !used.has(p.id)) ?? null;
      if (pick) used.add(pick.id);
      slots.push({ line, player: pick });
    }
  }

  const bench = byRel.filter((p) => !used.has(p.id));
  // Orden bonito: portero, defensa, medio, delantero.
  slots.sort((a, b) => ORDER.indexOf(a.line) - ORDER.indexOf(b.line));
  return { slots, bench };
}
