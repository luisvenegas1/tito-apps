/**
 * Balanceador de equipos para mejengas / mini-cuadrangulares.
 *
 * Escala de nivel 1–5 (1 Recreativo, 2 Casual, 3 Intermedio, 4 Avanzado, 5 Élite).
 * Jugadores SIN EVALUAR reciben DEFAULT_LEVEL = 2 (Casual): un escalón por
 * debajo del medio, para no inflar al equipo que recibe a un desconocido.
 *
 * Estrategia:
 *  1. Repartir porteros primero (uno por equipo, por nivel desc) — restricción dura.
 *  2. Repartir el resto con LPT (Longest Processing Time): ordenar por nivel desc
 *     y asignar cada jugador al equipo más débil con cupo. Esto reparte a los
 *     AVANZADOS primero y usa a los RECREATIVOS para compensar a los equipos
 *     fuertes; los INTERMEDIOS completan. Minimiza la diferencia de puntos.
 *  3. Mejora local por swaps 1-a-1 que reduzcan la diferencia, con GUARDIA DE
 *     PORTERO: nunca dejar sin arquero a un equipo que ya tenía uno.
 */

/** Nivel asumido para jugadores sin evaluar (Casual, un escalón bajo el medio). */
export const DEFAULT_LEVEL = 2;

export interface BalancePlayer {
  id: string;
  name: string;
  level: number | null; // 1-5, null = sin evaluar
  canGoalkeeper?: boolean;
  position?: string | null;
}

export interface Team {
  index: number;
  players: BalancePlayer[];
  score: number;
}

function levelOf(p: BalancePlayer): number {
  return p.level ?? DEFAULT_LEVEL;
}

function teamScore(players: BalancePlayer[]): number {
  return players.reduce((s, p) => s + levelOf(p), 0);
}

function keeperCount(players: BalancePlayer[]): number {
  return players.reduce((n, p) => n + (p.canGoalkeeper ? 1 : 0), 0);
}

function spread(buckets: BalancePlayer[][]): number {
  const scores = buckets.map(teamScore);
  return Math.max(...scores) - Math.min(...scores);
}

/** Capacidades (tamaños objetivo) para repartir parejo la cantidad de jugadores. */
function capacities(total: number, numTeams: number): number[] {
  const base = Math.floor(total / numTeams);
  const extra = total % numTeams;
  return Array.from({ length: numTeams }, (_, i) => base + (i < extra ? 1 : 0));
}

export function balanceTeams(players: BalancePlayer[], numTeams: number): Team[] {
  if (numTeams < 2) numTeams = 2;
  const buckets: BalancePlayer[][] = Array.from({ length: numTeams }, () => []);
  const caps = capacities(players.length, numTeams);

  // 1) Porteros primero, uno por equipo (por nivel desc).
  const keepers = players
    .filter((p) => p.canGoalkeeper)
    .sort((a, b) => levelOf(b) - levelOf(a));
  const usedKeeperIds = new Set<string>();
  for (let t = 0; t < numTeams && t < keepers.length; t++) {
    buckets[t].push(keepers[t]);
    usedKeeperIds.add(keepers[t].id);
  }
  const remainingKeepers = keepers.filter((k) => !usedKeeperIds.has(k.id));

  // 2) LPT con capacidad para el resto (campo + porteros sobrantes).
  const pool = [...players.filter((p) => !p.canGoalkeeper), ...remainingKeepers].sort(
    (a, b) => levelOf(b) - levelOf(a),
  );
  for (const p of pool) {
    let best = -1;
    for (let t = 0; t < numTeams; t++) {
      if (buckets[t].length >= caps[t]) continue; // respeta el tamaño de equipo
      if (
        best === -1 ||
        teamScore(buckets[t]) < teamScore(buckets[best]) ||
        (teamScore(buckets[t]) === teamScore(buckets[best]) &&
          buckets[t].length < buckets[best].length)
      ) {
        best = t;
      }
    }
    if (best === -1) best = 0; // fallback (no debería ocurrir)
    buckets[best].push(p);
  }

  // 3) Mejora local con guardia de portero.
  improve(buckets);

  return buckets.map((players, index) => ({ index, players, score: teamScore(players) }));
}

/** ¿El swap deja a algún equipo (que tenía portero) sin ninguno? */
function swapBreaksKeepers(
  hiPlayers: BalancePlayer[],
  loPlayers: BalancePlayer[],
  a: BalancePlayer,
  b: BalancePlayer,
): boolean {
  const hiKeepers = keeperCount(hiPlayers);
  const loKeepers = keeperCount(loPlayers);
  const hiAfter = hiKeepers - (a.canGoalkeeper ? 1 : 0) + (b.canGoalkeeper ? 1 : 0);
  const loAfter = loKeepers - (b.canGoalkeeper ? 1 : 0) + (a.canGoalkeeper ? 1 : 0);
  if (hiKeepers > 0 && hiAfter === 0) return true;
  if (loKeepers > 0 && loAfter === 0) return true;
  return false;
}

function improve(buckets: BalancePlayer[][], maxIters = 300): void {
  for (let iter = 0; iter < maxIters; iter++) {
    const scores = buckets.map(teamScore);
    const hi = scores.indexOf(Math.max(...scores));
    const lo = scores.indexOf(Math.min(...scores));
    if (hi === lo) break;

    const before = spread(buckets);
    let bestDelta = 0;
    let bestSwap: [number, number] | null = null;

    for (let i = 0; i < buckets[hi].length; i++) {
      for (let j = 0; j < buckets[lo].length; j++) {
        const a = buckets[hi][i];
        const b = buckets[lo][j];
        if (swapBreaksKeepers(buckets[hi], buckets[lo], a, b)) continue;
        const newHi = teamScore(buckets[hi]) - levelOf(a) + levelOf(b);
        const newLo = teamScore(buckets[lo]) - levelOf(b) + levelOf(a);
        const others = buckets.map((bk, idx) =>
          idx === hi ? newHi : idx === lo ? newLo : teamScore(bk),
        );
        const newSpread = Math.max(...others) - Math.min(...others);
        const delta = before - newSpread;
        if (delta > bestDelta) {
          bestDelta = delta;
          bestSwap = [i, j];
        }
      }
    }

    if (!bestSwap) break;
    const [i, j] = bestSwap;
    const tmp = buckets[hi][i];
    buckets[hi][i] = buckets[lo][j];
    buckets[lo][j] = tmp;
  }
}

/** Recalcula puntajes tras un movimiento manual. */
export function rescore(teams: Team[]): Team[] {
  return teams.map((t) => ({ ...t, score: teamScore(t.players) }));
}
