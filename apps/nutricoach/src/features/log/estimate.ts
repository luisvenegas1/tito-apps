import { ai } from "@/lib/ai/client";

export interface EstimatedMacros {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
}

const ZERO: EstimatedMacros = { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 };
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Estima los macros de UN alimento por su nombre y cantidad, usando la IA de
 * texto (`parse-meal-text`). Si el modelo devuelve varios sub-ítems (ej.
 * "lentejas con pollo"), los suma y reescala a los gramos indicados.
 */
export async function estimateMacros(name: string, grams: number): Promise<EstimatedMacros> {
  const clean = name.trim();
  if (!clean || grams <= 0) return { ...ZERO };
  const res = await ai.parseMealText({ text: `${grams} g de ${clean}` });
  const items = res.items ?? [];
  if (items.length === 0) return { ...ZERO };

  const sum = items.reduce(
    (acc, it) => ({
      kcal: acc.kcal + (it.kcal || 0),
      protein_g: acc.protein_g + (it.protein_g || 0),
      carb_g: acc.carb_g + (it.carb_g || 0),
      fat_g: acc.fat_g + (it.fat_g || 0),
      fiber_g: acc.fiber_g + (it.fiber_g || 0),
      sugar_g: acc.sugar_g + (it.sugar_g || 0),
      sodium_mg: acc.sodium_mg + (it.sodium_mg || 0),
      grams: acc.grams + (it.grams || 0),
    }),
    { ...ZERO, grams: 0 },
  );

  const factor = sum.grams > 0 ? grams / sum.grams : 1;
  return {
    kcal: Math.round(sum.kcal * factor),
    protein_g: r1(sum.protein_g * factor),
    carb_g: r1(sum.carb_g * factor),
    fat_g: r1(sum.fat_g * factor),
    fiber_g: r1(sum.fiber_g * factor),
    sugar_g: r1(sum.sugar_g * factor),
    sodium_mg: Math.round(sum.sodium_mg * factor),
  };
}
