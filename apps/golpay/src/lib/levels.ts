/**
 * Niveles de habilidad de GolPay (privados, solo para armar equipos).
 *
 * Escala numérica 1–5, donde 5 es el mejor. Se usa el número pelado a
 * propósito: las etiquetas ("Recreativo", "Casual") sonaban a juicio sobre la
 * persona, y en la cancha nadie las usaba. Un número es más rápido de asignar
 * y no ofende a nadie.
 */
export type SkillLevel = 1 | 2 | 3 | 4 | 5;

export const LEVELS: SkillLevel[] = [1, 2, 3, 4, 5];

export const LEVEL_LABELS: Record<SkillLevel, string> = {
  5: "5",
  4: "4",
  3: "3",
  2: "2",
  1: "1",
};

/** Para pantallas con espacio, donde ayuda saber hacia dónde crece la escala. */
export const LEVEL_SCALE_HINT = "1 = principiante · 5 = el que la rompe";

/** Nivel preseleccionado al crear un jugador a mano: el medio. */
export const DEFAULT_SKILL_LEVEL: SkillLevel = 3;

export function isSkillLevel(level: unknown): level is SkillLevel {
  return typeof level === "number" && Number.isInteger(level) && level >= 1 && level <= 5;
}

/** "3" · "Sin evaluar" si no tiene nivel. */
export function levelLabel(level: number | null | undefined): string {
  return isSkillLevel(level) ? LEVEL_LABELS[level] : "Sin evaluar";
}

/** "Nivel 3" · "Sin evaluar". Para renglones donde el número solo confunde. */
export function levelLabelLong(level: number | null | undefined): string {
  return isSkillLevel(level) ? `Nivel ${level}` : "Sin evaluar";
}
