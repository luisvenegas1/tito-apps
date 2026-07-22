import type {
  ActivityLevel,
  DailyTargets,
  EnergyProfile,
  GoalType,
} from "./types";

/** Multiplicadores estándar de nivel de actividad sobre el BMR. */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Metabolismo basal (BMR) — ecuación de Mifflin-St Jeor.
 *   male:   10*kg + 6.25*cm - 5*age + 5
 *   female: 10*kg + 6.25*cm - 5*age - 161
 */
export function bmrMifflinStJeor(p: EnergyProfile): number {
  const base = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age;
  return Math.round(base + (p.sex === "male" ? 5 : -161));
}

/** Gasto energético diario total (TDEE) = BMR × factor de actividad. */
export function tdee(p: EnergyProfile): number {
  return Math.round(bmrMifflinStJeor(p) * ACTIVITY_FACTORS[p.activity]);
}

/**
 * Ajuste calórico por objetivo (kcal/día sobre el TDEE).
 * Basado en ~7700 kcal por kg de grasa corporal.
 *   1 kg/semana ≈ 1100 kcal/día. Se limita a un ritmo seguro por defecto.
 */
export function calorieDeltaForGoal(
  goal: GoalType,
  _tdeeValue: number,
  rateKgPerWeek = 0.5,
): number {
  const perDay = (rateKgPerWeek * 7700) / 7;
  switch (goal) {
    case "lose_fat":
    case "deficit":
      return -Math.round(perDay);
    case "gain_muscle":
    case "bulk":
      // El superávit para músculo es más conservador que el déficit para grasa.
      return Math.round(perDay * 0.6);
    case "maintain":
    case "custom":
    default:
      return 0;
  }
}

export interface TargetsInput {
  profile: EnergyProfile;
  goal: GoalType;
  /** Ritmo deseado en kg/semana (magnitud). Por defecto 0.5. */
  rateKgPerWeek?: number;
  /** Proteína en g por kg de peso. Por defecto 2.0 (rango 1.6–2.2). */
  proteinPerKg?: number;
  /** Grasa en g por kg de peso. Por defecto 0.9 (rango 0.8–1.0). */
  fatPerKg?: number;
}

/**
 * Calcula las metas diarias (calorías + macros) a partir del perfil y el objetivo.
 * Reparto: proteína y grasa por peso corporal; los carbohidratos rellenan el resto.
 * Determinista y testeable — no hace I/O.
 */
export function computeDailyTargets(input: TargetsInput): DailyTargets {
  const { profile, goal } = input;
  const rate = input.rateKgPerWeek ?? 0.5;
  const proteinPerKg = input.proteinPerKg ?? 2.0;
  const fatPerKg = input.fatPerKg ?? 0.9;

  const maintenance = tdee(profile);
  const calorie_target = Math.max(
    1200, // piso de seguridad; la app avisa si el objetivo cae por debajo
    Math.round(maintenance + calorieDeltaForGoal(goal, maintenance, rate)),
  );

  const protein_g = Math.round(proteinPerKg * profile.weight_kg);
  const fat_g = Math.round(fatPerKg * profile.weight_kg);

  const kcalFromProtein = protein_g * 4;
  const kcalFromFat = fat_g * 9;
  const carb_g = Math.max(
    0,
    Math.round((calorie_target - kcalFromProtein - kcalFromFat) / 4),
  );

  // Fibra recomendada ~14 g por cada 1000 kcal.
  const fiber_g = Math.round((calorie_target / 1000) * 14);
  // Hidratación base ~35 ml por kg de peso.
  const water_ml = Math.round(profile.weight_kg * 35);

  return { calorie_target, protein_g, carb_g, fat_g, fiber_g, water_ml };
}
