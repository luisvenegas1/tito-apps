/**
 * Niveles de habilidad de GolPay (privados, solo para armar equipos).
 * Escala 1–3, sin términos despectivos.
 *   3 = Avanzado · 2 = Intermedio · 1 = Recreativo
 */
export type SkillLevel = 1 | 2 | 3;

export const LEVELS: SkillLevel[] = [1, 2, 3];

export const LEVEL_LABELS: Record<SkillLevel, string> = {
  3: "Avanzado",
  2: "Intermedio",
  1: "Recreativo",
};

/** Nivel por defecto cuando un jugador no tiene nivel registrado: Intermedio. */
export const DEFAULT_SKILL_LEVEL: SkillLevel = 2;

export function levelLabel(level: number | null | undefined): string {
  if (level === 1 || level === 2 || level === 3) return LEVEL_LABELS[level];
  return "Sin evaluar";
}
