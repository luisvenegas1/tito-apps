import type { DailyTargets, Macros, Per100g, Remaining } from "./types";

const round = (n: number, d = 1): number => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

/**
 * Escala valores nutricionales por-100g a una cantidad concreta en gramos.
 *   scaleMacros(per100g, 150) -> macros de 150 g
 * Es el cálculo central del registro por foto/balanza/etiqueta.
 */
export function scaleMacros(per100g: Per100g, grams: number): Macros {
  const k = grams / 100;
  const out: Macros = {
    kcal: Math.round(per100g.kcal * k),
    protein_g: round(per100g.protein_g * k),
    carb_g: round(per100g.carb_g * k),
    fat_g: round(per100g.fat_g * k),
  };
  if (per100g.fiber_g != null) out.fiber_g = round(per100g.fiber_g * k);
  if (per100g.sugar_g != null) out.sugar_g = round(per100g.sugar_g * k);
  if (per100g.sodium_mg != null) out.sodium_mg = Math.round(per100g.sodium_mg * k);
  return out;
}

const EMPTY: Macros = { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 };

/** Suma una lista de macros (ignora undefined). Base de los totales del día. */
export function sumMacros(items: Macros[]): Macros {
  const t = items.reduce<Macros>(
    (acc, m) => ({
      kcal: acc.kcal + (m.kcal || 0),
      protein_g: acc.protein_g + (m.protein_g || 0),
      carb_g: acc.carb_g + (m.carb_g || 0),
      fat_g: acc.fat_g + (m.fat_g || 0),
      fiber_g: (acc.fiber_g || 0) + (m.fiber_g || 0),
      sugar_g: (acc.sugar_g || 0) + (m.sugar_g || 0),
      sodium_mg: (acc.sodium_mg || 0) + (m.sodium_mg || 0),
    }),
    { ...EMPTY },
  );
  return {
    kcal: Math.round(t.kcal),
    protein_g: round(t.protein_g),
    carb_g: round(t.carb_g),
    fat_g: round(t.fat_g),
    fiber_g: round(t.fiber_g || 0),
    sugar_g: round(t.sugar_g || 0),
    sodium_mg: Math.round(t.sodium_mg || 0),
  };
}

/** Calcula lo que falta consumir del día (meta menos consumido, nunca negativo por debajo de 0 salvo kcal). */
export function computeRemaining(targets: DailyTargets, consumed: Macros): Remaining {
  return {
    kcal: targets.calorie_target - consumed.kcal,
    protein_g: round(targets.protein_g - consumed.protein_g),
    carb_g: round(targets.carb_g - consumed.carb_g),
    fat_g: round(targets.fat_g - consumed.fat_g),
    fiber_g: round(targets.fiber_g - (consumed.fiber_g || 0)),
  };
}

/** Porcentaje de la meta calórica consumido (0–n). Útil para el velocímetro. */
export function caloriePercent(targets: DailyTargets, consumed: Macros): number {
  if (targets.calorie_target <= 0) return 0;
  return consumed.kcal / targets.calorie_target;
}

export type GaugeZone = "green" | "yellow" | "orange" | "red";

/**
 * Zona de color del velocímetro según el porcentaje de meta calórica consumido.
 *   <70% verde · 70–90% amarillo · 90–100% naranja · >100% rojo
 */
export function gaugeZone(percent: number): GaugeZone {
  if (percent > 1) return "red";
  if (percent >= 0.9) return "orange";
  if (percent >= 0.7) return "yellow";
  return "green";
}

/**
 * Score simple de calidad de una comida/día (0–100): premia proteína y fibra,
 * penaliza exceso de azúcar y sodio. Heurística; el coach da el matiz.
 */
export function qualityScore(m: Macros): number {
  const kcal = m.kcal || 1;
  const proteinDensity = (m.protein_g * 4) / kcal; // fracción de kcal de proteína
  const fiberBonus = Math.min((m.fiber_g || 0) / 30, 1);
  const sugarPenalty = Math.min((m.sugar_g || 0) / 90, 1);
  const sodiumPenalty = Math.min((m.sodium_mg || 0) / 2300, 1);
  const raw = proteinDensity * 60 + fiberBonus * 25 - sugarPenalty * 20 - sodiumPenalty * 15 + 30;
  return Math.max(0, Math.min(100, Math.round(raw)));
}
