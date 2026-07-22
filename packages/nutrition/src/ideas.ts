import type { Macros, Per100g, Remaining } from "./types";
import { scaleMacros } from "./macros";

/** Alimento candidato para sugerencias (valores por 100 g + nombre). */
export type FoodCandidate = Per100g & { name: string };

export interface MealIdea {
  name: string;
  grams: number;
  macros: Macros;
  score: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/**
 * Porción sugerida de un alimento para ayudar a cerrar los macros faltantes.
 * Apunta a cubrir ~60% de la proteína faltante, sin pasarse de las calorías
 * restantes. Devuelve gramos redondeados a 10, en rango 30..400.
 */
export function suggestPortion(remaining: Remaining, food: FoodCandidate): number {
  const proteinGap = Math.max(0, remaining.protein_g) * 0.6;
  let grams = food.protein_g > 0 ? (proteinGap / food.protein_g) * 100 : 120;
  if (food.kcal > 0 && remaining.kcal > 0) {
    grams = Math.min(grams, (remaining.kcal / food.kcal) * 100);
  }
  return roundTo(clamp(grams, 30, 400), 10);
}

/**
 * Puntúa qué tan bien una porción cierra la brecha: premia llenar proteína
 * faltante y penaliza excederse de las calorías restantes.
 */
export function scoreIdea(remaining: Remaining, macros: Macros): number {
  const proteinFill = clamp(macros.protein_g / Math.max(remaining.protein_g, 1), 0, 1);
  const kcalOver =
    remaining.kcal > 0 && macros.kcal > remaining.kcal
      ? (macros.kcal - remaining.kcal) / remaining.kcal
      : 0;
  return Math.round(proteinFill * 100 - clamp(kcalOver, 0, 2) * 50);
}

/**
 * Rankea una librería de alimentos según los macros faltantes del día y
 * devuelve las mejores ideas con su porción sugerida. Puro y determinista.
 */
export function rankMealIdeas(
  remaining: Remaining,
  foods: FoodCandidate[],
  limit = 4,
): MealIdea[] {
  return foods
    .map((food) => {
      const grams = suggestPortion(remaining, food);
      const macros = scaleMacros(food, grams);
      return { name: food.name, grams, macros, score: scoreIdea(remaining, macros) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
