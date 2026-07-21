/**
 * Tabla de posiciones de un minitorneo (round-robin entre los equipos de un
 * partido). Puntos: victoria 3, empate 1, derrota 0. Desempates básicos:
 * puntos → diferencia de goles → victorias → nombre.
 */
export interface Game {
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
}

export interface Standing {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export function computeStandings(games: Game[], teams: { id: string; name: string }[]): Standing[] {
  const table = new Map<string, Standing>();
  for (const t of teams) {
    table.set(t.id, {
      teamId: t.id, teamName: t.name, played: 0, wins: 0, draws: 0, losses: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
    });
  }
  for (const g of games) {
    const h = table.get(g.home_team_id);
    const a = table.get(g.away_team_id);
    if (!h || !a) continue;
    h.played++; a.played++;
    h.goalsFor += g.home_score; h.goalsAgainst += g.away_score;
    a.goalsFor += g.away_score; a.goalsAgainst += g.home_score;
    if (g.home_score > g.away_score) { h.wins++; h.points += 3; a.losses++; }
    else if (g.home_score < g.away_score) { a.wins++; a.points += 3; h.losses++; }
    else { h.draws++; a.draws++; h.points++; a.points++; }
  }
  const rows = [...table.values()];
  for (const r of rows) r.goalDiff = r.goalsFor - r.goalsAgainst;
  return rows.sort(
    (x, y) => y.points - x.points || y.goalDiff - x.goalDiff || y.wins - x.wins || x.teamName.localeCompare(y.teamName),
  );
}

/**
 * Campeón según la tabla: el líder, SOLO si no está empatado en la cima con
 * otro (mismos puntos, misma diferencia y mismas victorias). Si hay empate
 * arriba, devuelve null — no inventamos un ganador.
 * Requiere al menos un juego cargado.
 */
export function championId(standings: Standing[]): string | null {
  if (standings.length === 0) return null;
  const top = standings[0];
  if (top.played === 0) return null;
  const second = standings[1];
  if (
    second &&
    second.points === top.points &&
    second.goalDiff === top.goalDiff &&
    second.wins === top.wins
  ) {
    return null; // empate en el primer lugar
  }
  return top.teamId;
}
