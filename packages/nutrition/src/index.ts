// @titoapps/nutrition — motor NEUTRAL de energía y macronutrientes.
// Puro (sin React, sin I/O). Toda app de salud del ecosistema puede usarlo.
// Regla: ninguna app debe reimplementar estas fórmulas. Toda fórmula nueva entra con test.

export type {
  Sex,
  ActivityLevel,
  GoalType,
  Macros,
  Per100g,
  DailyTargets,
  EnergyProfile,
  Remaining,
} from "./types";

export {
  ACTIVITY_FACTORS,
  bmrMifflinStJeor,
  tdee,
  calorieDeltaForGoal,
  computeDailyTargets,
} from "./energy";
export type { TargetsInput } from "./energy";

export {
  scaleMacros,
  sumMacros,
  computeRemaining,
  caloriePercent,
  gaugeZone,
  qualityScore,
} from "./macros";
export type { GaugeZone } from "./macros";

export {
  average,
  daysBetween,
  adaptiveMaintenance,
  adherence,
  loggingStreak,
} from "./stats";
export type { IntakePoint, WeightPoint, AdherenceResult } from "./stats";

export { suggestPortion, scoreIdea, rankMealIdeas } from "./ideas";
export type { FoodCandidate, MealIdea } from "./ideas";
