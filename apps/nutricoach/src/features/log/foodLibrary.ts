import type { FoodCandidate } from "@titoapps/nutrition";

/**
 * Librería curada de alimentos comunes (valores por 100 g) para generar ideas
 * de comida según los macros faltantes del día. Fuente de referencia nutricional
 * estándar. Se puede ampliar o, más adelante, alimentar desde el catálogo del usuario.
 */
export const FOOD_LIBRARY: FoodCandidate[] = [
  { name: "Pechuga de pollo", kcal: 165, protein_g: 31, carb_g: 0, fat_g: 3.6, fiber_g: 0, sugar_g: 0, sodium_mg: 74 },
  { name: "Atún al natural", kcal: 116, protein_g: 26, carb_g: 0, fat_g: 1, fiber_g: 0, sugar_g: 0, sodium_mg: 247 },
  { name: "Huevo", kcal: 155, protein_g: 13, carb_g: 1.1, fat_g: 11, fiber_g: 0, sugar_g: 1.1, sodium_mg: 124 },
  { name: "Claras de huevo", kcal: 52, protein_g: 11, carb_g: 0.7, fat_g: 0.2, fiber_g: 0, sugar_g: 0.7, sodium_mg: 166 },
  { name: "Yogur griego natural", kcal: 59, protein_g: 10, carb_g: 3.6, fat_g: 0.4, fiber_g: 0, sugar_g: 3.2, sodium_mg: 36 },
  { name: "Queso cottage", kcal: 98, protein_g: 11, carb_g: 3.4, fat_g: 4.3, fiber_g: 0, sugar_g: 2.7, sodium_mg: 364 },
  { name: "Lentejas cocidas", kcal: 116, protein_g: 9, carb_g: 20, fat_g: 0.4, fiber_g: 8, sugar_g: 1.8, sodium_mg: 2 },
  { name: "Frijoles negros", kcal: 132, protein_g: 8.9, carb_g: 24, fat_g: 0.5, fiber_g: 8.7, sugar_g: 0.3, sodium_mg: 2 },
  { name: "Arroz integral", kcal: 123, protein_g: 2.7, carb_g: 26, fat_g: 1, fiber_g: 1.6, sugar_g: 0.4, sodium_mg: 4 },
  { name: "Avena", kcal: 389, protein_g: 17, carb_g: 66, fat_g: 7, fiber_g: 11, sugar_g: 1, sodium_mg: 2 },
  { name: "Banano", kcal: 89, protein_g: 1.1, carb_g: 23, fat_g: 0.3, fiber_g: 2.6, sugar_g: 12, sodium_mg: 1 },
  { name: "Manzana", kcal: 52, protein_g: 0.3, carb_g: 14, fat_g: 0.2, fiber_g: 2.4, sugar_g: 10, sodium_mg: 1 },
  { name: "Almendras", kcal: 579, protein_g: 21, carb_g: 22, fat_g: 50, fiber_g: 12, sugar_g: 4, sodium_mg: 1 },
  { name: "Aguacate", kcal: 160, protein_g: 2, carb_g: 9, fat_g: 15, fiber_g: 7, sugar_g: 0.7, sodium_mg: 7 },
  { name: "Salmón", kcal: 208, protein_g: 20, carb_g: 0, fat_g: 13, fiber_g: 0, sugar_g: 0, sodium_mg: 59 },
  { name: "Tofu firme", kcal: 144, protein_g: 17, carb_g: 3, fat_g: 9, fiber_g: 2, sugar_g: 0.6, sodium_mg: 14 },
  { name: "Brócoli", kcal: 34, protein_g: 2.8, carb_g: 7, fat_g: 0.4, fiber_g: 2.6, sugar_g: 1.7, sodium_mg: 33 },
  { name: "Batata (camote)", kcal: 86, protein_g: 1.6, carb_g: 20, fat_g: 0.1, fiber_g: 3, sugar_g: 4.2, sodium_mg: 55 },
];
