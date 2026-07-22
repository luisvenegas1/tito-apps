/**
 * Contratos tipados de las Edge Functions de IA.
 * El cliente los usa para invocar; las funciones (Deno) los implementan.
 * Ver docs/ai.md. Ninguna clave de proveedor toca el cliente.
 */
import type { Macros, Per100g } from "@titoapps/nutrition";

/** analyze-food — análisis de foto de un plato. */
export interface AnalyzeFoodRequest {
  imageBase64: string;
  hint?: string;
}
export interface DetectedFoodItem extends Macros {
  name: string;
  grams: number;
  confidence: number;
}
export interface AnalyzeFoodResponse {
  items: DetectedFoodItem[];
}

/** analyze-scale — foto de alimento sobre una balanza. */
export interface AnalyzeScaleRequest {
  imageBase64: string;
}
export interface AnalyzeScaleResponse {
  food: { name: string };
  grams: number | null;
  gramsConfidence: number;
  per100g: Per100g;
}

/** analyze-label — foto de la tabla nutricional del empaque. */
export interface AnalyzeLabelRequest {
  imageBase64: string;
  consumedGrams?: number;
}
export interface AnalyzeLabelResponse {
  per100g: Per100g;
  servingSize_g?: number;
}

/** coach — conversacional y proactivo. */
export interface CoachDayContext {
  goalType: string;
  calorieTarget: number;
  consumed: Macros;
  remaining: Macros;
  weightKg?: number;
  targetWeightKg?: number;
  kcalBurned?: number;
}
export interface CoachRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  dayContext: CoachDayContext;
  /** true = pedir una recomendación proactiva sin mensaje del usuario. */
  proactive?: boolean;
}
export interface CoachSuggestion {
  label: string;
  action?: string;
}
export interface CoachResponse {
  reply: string;
  suggestions?: CoachSuggestion[];
}

/** meal-plan — plan de comidas generado por IA. */
export interface PlanMeal {
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  kcal: number;
  protein_g: number;
}
export interface PlanDay {
  label: string;
  meals: PlanMeal[];
}
export interface MealPlanRequest {
  goalType: string;
  targets: { calorie_target: number; protein_g: number; carb_g: number; fat_g: number };
  days?: number; // 1 = día, 7 = semana
  preferences?: string;
}
export interface MealPlanResponse {
  plan: PlanDay[];
}
