import type { DailyTargets } from "./types";

const KCAL_PER_KG = 7700; // energía aproximada por kg de masa corporal

export interface IntakePoint {
  date: string; // YYYY-MM-DD
  kcal: number;
}
export interface WeightPoint {
  date: string; // YYYY-MM-DD
  kg: number;
}

/** Promedio simple (0 si vacío). */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Días enteros entre dos fechas ISO (YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Mantenimiento (TDEE) adaptativo estilo MacroFactor.
 * A partir de la ingesta calórica real y la tendencia de peso en la ventana:
 *   TDEE ≈ ingestaPromedio − (ΔpesoKg × 7700 / díasVentana)
 * Devuelve null si no hay datos suficientes (≥2 pesos, ventana ≥7 días, con ingesta).
 */
export function adaptiveMaintenance(
  intake: IntakePoint[],
  weights: WeightPoint[],
): number | null {
  if (weights.length < 2) return null;
  const w = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const first = w[0];
  const last = w[w.length - 1];
  const days = daysBetween(first.date, last.date);
  if (days < 7) return null;

  const inWindow = intake.filter((p) => p.date >= first.date && p.date <= last.date);
  if (inWindow.length === 0) return null;

  const avgIntake = average(inWindow.map((p) => p.kcal));
  const deltaKg = last.kg - first.kg;
  const maintenance = avgIntake - (deltaKg * KCAL_PER_KG) / days;
  return Math.round(maintenance);
}

export interface AdherenceResult {
  loggedDays: number;
  onTargetDays: number;
  adherencePct: number; // 0..100
  avgKcal: number;
  avgProtein: number;
}

/**
 * Adherencia sobre una lista de totales diarios: qué % de días registrados
 * cae dentro de ±tolerance de la meta calórica.
 */
export function adherence(
  days: Array<{ kcal: number; protein_g: number }>,
  targets: DailyTargets,
  tolerance = 0.1,
): AdherenceResult {
  const logged = days.filter((d) => d.kcal > 0);
  const lo = targets.calorie_target * (1 - tolerance);
  const hi = targets.calorie_target * (1 + tolerance);
  const onTarget = logged.filter((d) => d.kcal >= lo && d.kcal <= hi).length;
  return {
    loggedDays: logged.length,
    onTargetDays: onTarget,
    adherencePct: logged.length ? Math.round((onTarget / logged.length) * 100) : 0,
    avgKcal: Math.round(average(logged.map((d) => d.kcal))),
    avgProtein: Math.round(average(logged.map((d) => d.protein_g))),
  };
}

/**
 * Racha de días consecutivos con registro, contando hacia atrás desde el final.
 * `days` debe venir ordenado cronológicamente (el último es el más reciente).
 */
export function loggingStreak(days: Array<{ kcal: number }>): number {
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].kcal > 0) streak++;
    else break;
  }
  return streak;
}
