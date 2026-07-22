// @titoapps/health — capa NEUTRAL de normalización de actividad/entrenamientos.
// Puro (sin React, sin I/O). Deja lista la integración con Apple Health,
// Google Health, Garmin, Fitbit y Amazfit: cada proveedor solo implementa
// HealthProvider y mapea con los adapters puros de este paquete.

export type {
  HealthSource,
  WorkoutType,
  NormalizedWorkout,
  HealthProvider,
} from "./types";

export { MET, WORKOUT_LABELS, estimateCalories } from "./met";

export {
  normalizeType,
  fromAppleHealth,
  fromGoogleHealth,
  fromGarmin,
  fromFitbit,
  fromStrava,
} from "./adapters";
export type {
  AppleWorkoutSample,
  GoogleSession,
  GarminActivity,
  FitbitActivityLog,
  StravaActivity,
} from "./adapters";

export { dedupeByExternalId } from "./dedupe";

export { PROVIDERS, MockWearableProvider } from "./providers";
export type { ProviderInfo } from "./providers";

export { FitbitProvider } from "./fitbit";
export { StravaProvider } from "./strava";
