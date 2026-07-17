/**
 * Recomendador de formato de equipos según cantidad de jugadores y porteros.
 * GolPay NO asume cuadrangular: recomienda 2/3/4+ equipos y el organizador
 * siempre puede sobrescribir. Ideal 5–6 por equipo, con cambios.
 */
export interface FormatRecommendation {
  teams: number;
  minPerTeam: number;
  maxPerTeam: number;
  /** Cambios estimados por equipo (jugadores de más allá de ~5 en cancha). */
  substitutesPerTeam: number;
  /** Aviso si no hay porteros suficientes para un equipo cada uno. */
  keeperWarning?: string;
  label: string;
}

/** Cantidad de equipos recomendada según jugadores. */
export function recommendTeams(playerCount: number): number {
  const n = playerCount;
  if (n < 10) return 2;
  if (n <= 14) return 2; // 10–14 → 2 (13–14 con cambios)
  if (n <= 19) return 3; // 15–19 → 3
  if (n <= 24) return 4; // 20–24 → 4
  return Math.ceil(n / 6); // más → más equipos
}

export function recommendFormat(playerCount: number, keeperCount = 0): FormatRecommendation {
  const teams = recommendTeams(playerCount);
  const base = Math.floor(playerCount / teams);
  const extra = playerCount % teams;
  const minPerTeam = base;
  const maxPerTeam = base + (extra > 0 ? 1 : 0);
  const substitutesPerTeam = Math.max(0, minPerTeam - 5);

  const rec: FormatRecommendation = {
    teams,
    minPerTeam,
    maxPerTeam,
    substitutesPerTeam,
    label:
      minPerTeam === maxPerTeam
        ? `${teams} equipos de ${minPerTeam}`
        : `${teams} equipos de ${minPerTeam}–${maxPerTeam}`,
  };
  if (keeperCount < teams) {
    rec.keeperWarning = `Solo hay ${keeperCount} portero(s) para ${teams} equipos.`;
  }
  return rec;
}
