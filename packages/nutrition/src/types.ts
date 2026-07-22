// Tipos NEUTRALES del dominio de nutrición. Sin React, sin I/O, sin dependencias.

/** Sexo biológico usado por las fórmulas de metabolismo. */
export type Sex = "male" | "female";

/** Nivel de actividad física (multiplicador sobre BMR). */
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

/** Tipo de objetivo del usuario. */
export type GoalType =
  | "lose_fat"
  | "gain_muscle"
  | "maintain"
  | "deficit"
  | "bulk"
  | "custom";

/** Conjunto de macronutrientes y sub-métricas. Todos opcionales salvo lo esencial. */
export interface Macros {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  // Sub-métricas opcionales. Aceptan null para interoperar con las filas de la
  // base de datos (donde los campos nullable llegan como null, no undefined).
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
}

/** Valores nutricionales expresados por 100 g (formato del catálogo `foods`). */
export type Per100g = Macros;

/** Metas diarias calculadas a partir de perfil + objetivo. */
export interface DailyTargets {
  calorie_target: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number;
  water_ml: number;
}

/** Datos del perfil necesarios para el cálculo energético. */
export interface EnergyProfile {
  sex: Sex;
  age: number;
  height_cm: number;
  weight_kg: number;
  activity: ActivityLevel;
}

/** Faltantes del día (meta menos consumido) por métrica. */
export interface Remaining {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number;
}
