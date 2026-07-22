/**
 * Tipos de dominio de NutriCoach (escritos a mano, patrón del monorepo).
 * En producción podés generarlos con:
 *   npx supabase gen types typescript --project-id XXXX > src/lib/supabase/types.ts
 */
import type {
  ActivityLevel,
  GoalType,
  Sex,
} from "@titoapps/nutrition";

export type Units = "metric" | "imperial";
export type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export type FoodSource = "custom" | "barcode" | "ai" | "search";
export type LogItemSource =
  | "photo"
  | "scale"
  | "label"
  | "barcode"
  | "search"
  | "custom"
  | "recipe";
export type WorkoutSource =
  | "manual"
  | "apple_health"
  | "google_health"
  | "garmin"
  | "fitbit"
  | "amazfit";
export type CoachRole = "user" | "assistant" | "system";

export interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  display_name: string | null;
  sex: Sex | null;
  birth_date: string | null; // ISO date
  height_cm: number | null;
  activity_level: ActivityLevel | null;
  units: Units;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  type: GoalType;
  target_weight_kg: number | null;
  rate_kg_per_week: number | null;
  calorie_target: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g_max: number | null;
  sodium_mg_max: number | null;
  water_ml: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Food {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  source: FoodSource;
  serving_g: number | null;
  // por 100 g
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  created_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  log_date: string; // ISO date
  created_at: string;
}

export interface LogItem {
  id: string;
  food_log_id: string;
  user_id: string;
  food_id: string | null;
  name: string;
  grams: number;
  meal: Meal;
  // macros absolutos snapshot
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  source: LogItemSource;
  confidence: number | null;
  created_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  ml: number;
  logged_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  type: string;
  name: string | null;
  duration_min: number | null;
  kcal_burned: number;
  source: WorkoutSource;
  external_id: string | null;
  performed_at: string;
  created_at: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  servings: number;
  created_at: string;
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  food_id: string | null;
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
}

export interface CoachMessage {
  id: string;
  user_id: string;
  role: CoachRole;
  content: string;
  context: Record<string, unknown> | null;
  created_at: string;
}
