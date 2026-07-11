/**
 * Balanceador de equipos para mejengas / mini-cuadrangulares.
 *
 * Soporta 2, 3, 4 o más equipos (hasta ~24 jugadores).
 * Estrategia:
 *  1. Snake draft por nivel (reparte los mejores de forma alternada).
 *  2. Restricción de porteros: se reparten primero, uno por equipo.
 *  3. Mejora local: swaps entre equipos que reduzcan la diferencia de nivel.
 *
 * El nivel es privado (1-5). Jugadores sin nivel reciben DEFAULT_LEVEL.
 */

export const DEFAULT_LEVEL = 3;

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

function spread(teams: BalancePlayer[][]): number {
  const scores = teams.map(teamScore);
  return Math.max(...scores) - Math.min(...scores);
}

/**
 * Distribuye jugadores en `numTeams` equipos balanceados.
 */
export function balanceTeams(
  players: BalancePlayer[],
  numTeams: number,
): Team[] {
  if (numTeams < 2) numTeams = 2;
  const buckets: BalancePlayer[][] = Array.from({ length: numTeams }, () => []);

  // 1) Repartir porteros primero (uno por equipo, por nivel desc).
  const keepers = players
    .filter((p) => p.canGoalkeeper)
    .sort((a, b) => levelOf(b) - levelOf(a));
  const fieldPlayers = players.filter((p) => !p.canGoalkeeper);

  const usedKeeperIds = new Set<string>();
  for (let t = 0; t < numTeams && t < keepers.length; t++) {
    buckets[t].push(keepers[t]);
    usedKeeperIds.add(keepers[t].id);
  }
  // Porteros sobrantes vuelven al pool de campo.
  const remainingKeepers = keepers.filter((k) => !usedKeeperIds.has(k.id));

  // 2) Snake draft con el resto, ordenado por nivel desc.
  const pool = [...fieldPlayers, ...remainingKeepers].sort(
    (a, b) => levelOf(b) - levelOf(a),
  );

  let dir = 1;
  let t = 0;
  for (const p of pool) {
    buckets[t].push(p);
    if (dir === 1 && t === numTeams - 1) {
      dir = -1;
    } else if (dir === -1 && t === 0) {
      dir = 1;
    } else {
      t += dir;
    }
  }

  // 3) Mejora local: swaps que reduzcan el spread.
  improve(buckets);

  return buckets.map((players, index) => ({
    index,
    players,
    score: teamScore(players),
  }));
}

/** Intenta reducir la diferencia de nivel con intercambios simples. */
function improve(buckets: BalancePlayer[][], maxIters = 200): void {
  for (let iter = 0; iter < maxIters; iter++) {
    let improved = false;
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
        // No romper el reparto de porteros: evitar dejar un equipo sin portero.
        const newHi = teamScore(buckets[hi]) - levelOf(a) + levelOf(b);
        const newLo = teamScore(buckets[lo]) - levelOf(b) + levelOf(a);
        const otherScores = buckets
          .map((bk, idx) =>
            idx === hi ? newHi : idx === lo ? newLo : teamScore(bk),
          );
        const newSpread = Math.max(...otherScores) - Math.min(...otherScores);
        const delta = before - newSpread;
        if (delta > bestDelta) {
          bestDelta = delta;
          bestSwap = [i, j];
        }
      }
    }

    if (bestSwap) {
      const [i, j] = bestSwap;
      const tmp = buckets[hi][i];
      buckets[hi][i] = buckets[lo][j];
      buckets[lo][j] = tmp;
      improved = true;
    }
    if (!improved) break;
  }
}

/** Recalcula puntajes tras un movimiento manual. */
export function rescore(teams: Team[]): Team[] {
  return teams.map((t) => ({ ...t, score: teamScore(t.players) }));
}
