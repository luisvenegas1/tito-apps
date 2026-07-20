/**
 * Niveles de habilidad de GolPay (privados, solo para armar equipos).
 * Escala 1–5, sin términos despectivos.
 *   5 Élite · 4 Avanzado · 3 Intermedio · 2 Casual · 1 Recreativo
 */
export type SkillLevel = 1 | 2 | 3 | 4 | 5;

export const LEVELS: SkillLevel[] = [1, 2, 3, 4, 5];

export const LEVEL_LABELS: Record<SkillLevel, string> = {
  5: "Élite",
  4: "Avanzado",
  3: "Intermedio",
  2: "Casual",
  1: "Recreativo",
};

/** Nivel preseleccionado al crear un jugador a mano: Intermedio (el medio). */
export const DEFAULT_SKILL_LEVEL: SkillLevel = 3;

export function levelLabel(level: number | null | undefined): string {
  if (typeof level === "number" && Number.isInteger(level) && level >= 1 && level <= 5) {
    return LEVEL_LABELS[level as SkillLevel];
  }
  return "Sin evaluar";
}
