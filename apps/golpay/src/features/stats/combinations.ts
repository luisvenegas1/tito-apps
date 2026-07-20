/**
 * Estadísticas de combinaciones (puras): qué duplas ganan más / juegan mejor
 * juntas. Requiere un mínimo de partidos juntos para evitar datos engañosos.
 */
export interface TeamAppearance {
  match_id: string;
  won: boolean;
  members: string[]; // ids de jugador (frequent_player_id) o clave estable
}

export interface DuoStat {
  a: string;
  b: string;
  games: number;
  wins: number;
  winPct: number;
}

export function topDuos(apps: TeamAppearance[], minGames = 3): DuoStat[] {
  const map = new Map<string, { games: number; wins: number }>();
  for (const app of apps) {
    const m = [...new Set(app.members)].sort();
    for (let i = 0; i < m.length; i++) {
      for (let j = i + 1; j < m.length; j++) {
        const key = `${m[i]}|${m[j]}`;
        const rec = map.get(key) ?? { games: 0, wins: 0 };
        rec.games++;
        if (app.won) rec.wins++;
        map.set(key, rec);
      }
    }
  }
  const out: DuoStat[] = [];
  for (const [key, rec] of map) {
    if (rec.games >= minGames) {
      const [a, b] = key.split("|");
      out.push({ a, b, games: rec.games, wins: rec.wins, winPct: Math.round((rec.wins / rec.games) * 100) });
    }
  }
  return out.sort((x, y) => y.winPct - x.winPct || y.games - x.games);
}
