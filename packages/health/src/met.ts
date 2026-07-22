import type { WorkoutType } from "./types";

/**
 * Valores MET (Metabolic Equivalent of Task) de referencia por actividad.
 * Fuente: Compendium of Physical Activities (valores medios de intensidad moderada).
 */
export const MET: Record<WorkoutType, number> = {
  walking: 3.5,
  running: 9.8,
  cycling: 7.5,
  swimming: 8.0,
  strength: 6.0,
  hiit: 8.5,
  yoga: 3.0,
  elliptical: 5.0,
  rowing: 7.0,
  other: 4.0,
};

export const WORKOUT_LABELS: Record<WorkoutType, string> = {
  walking: "Caminar",
  running: "Correr",
  cycling: "Ciclismo",
  swimming: "Natación",
  strength: "Fuerza / pesas",
  hiit: "HIIT",
  yoga: "Yoga",
  elliptical: "Elíptica",
  rowing: "Remo",
  other: "Otro",
};

/**
 * Estima las calorías quemadas de un entrenamiento.
 *   kcal/min = MET × 3.5 × pesoKg / 200
 * Determinista y testeable. Si falta el peso, usa 70 kg como referencia.
 */
export function estimateCalories(type: WorkoutType, minutes: number, weightKg = 70): number {
  if (minutes <= 0 || weightKg <= 0) return 0;
  const kcalPerMin = (MET[type] * 3.5 * weightKg) / 200;
  return Math.round(kcalPerMin * minutes);
}
