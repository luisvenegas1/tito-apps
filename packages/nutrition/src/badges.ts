// @titoapps/nutrition — catálogo de badges del Seguimiento Profesional.
// Puro y extensible. La gamificación premia CONSTANCIA y ADHERENCIA, nunca
// comer menos ni saltarse comidas.

export interface BadgeStats {
  /** Días completos acumulados (cumplimiento 100%). */
  daysComplete: number;
  /** Racha actual de días completos. */
  currentStreak: number;
  /** Mejor racha histórica de días completos. */
  bestStreak: number;
  /** Cumplimiento promedio de los últimos 7 días (0..100). */
  weeklyCompliancePct: number;
}

export interface BadgeDef {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  test: (s: BadgeStats) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: "first_complete", emoji: "🏅", title: "Primer día completo", desc: "Cumpliste tu plan por primera vez", test: (s) => s.daysComplete >= 1 },
  { id: "streak_3", emoji: "🔥", title: "3 días seguidos", desc: "Racha de 3 días completos", test: (s) => s.bestStreak >= 3 },
  { id: "streak_7", emoji: "🔥", title: "7 días seguidos", desc: "Una semana perfecta de constancia", test: (s) => s.bestStreak >= 7 },
  { id: "streak_14", emoji: "🔥", title: "14 días seguidos", desc: "Dos semanas siguiendo tu plan", test: (s) => s.bestStreak >= 14 },
  { id: "streak_30", emoji: "🏆", title: "30 días seguidos", desc: "Un mes impecable", test: (s) => s.bestStreak >= 30 },
  { id: "complete_10", emoji: "💪", title: "10 días completos", desc: "Acumulaste 10 días cumplidos", test: (s) => s.daysComplete >= 10 },
  { id: "weekly_90", emoji: "🎯", title: "90% en la semana", desc: "90% de cumplimiento en los últimos 7 días", test: (s) => s.weeklyCompliancePct >= 90 },
];

/** IDs de badges ganados según las estadísticas del usuario. Puro y determinista. */
export function evaluateBadges(s: BadgeStats): string[] {
  return BADGES.filter((b) => b.test(s)).map((b) => b.id);
}

export function badgeById(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}
