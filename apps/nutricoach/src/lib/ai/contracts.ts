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

/** parse-meal-text — descripción de una comida en lenguaje natural. */
export interface ParseMealTextRequest {
  text: string;
  /** Nombres de los productos guardados del usuario, para que la IA los reconozca. */
  knownProducts?: string[];
}
export interface ParseMealTextResponse {
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
  /** Hora local del usuario (0-23) para que la sugerencia sea oportuna. */
  hour?: number;
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

/** classify-activity — determina el nivel de actividad a partir de un cuestionario. */
export interface ActivityAnswers {
  trainingDays: number; // días/semana de entrenamiento (gym/fuerza/cardio)
  trainingType: "strength" | "cardio" | "both" | "none";
  trainingMinutes: number; // minutos por sesión
  otherSports: string; // texto libre: "fútbol 2 veces, correr 1 vez"
  dailyMovement: "sitting" | "mixed" | "onfeet"; // el día normal
}
export interface ClassifyActivityRequest {
  answers: ActivityAnswers;
}
export interface ClassifyActivityResponse {
  activity: "sedentary" | "light" | "moderate" | "active" | "very_active";
  reason: string;
  confidence: number;
}
