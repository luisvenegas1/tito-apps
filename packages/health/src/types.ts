// Tipos NEUTRALES del dominio de salud/actividad. Sin React, sin I/O.

/** Origen de un entrenamiento (manual o proveedor de salud/wearable). */
export type HealthSource =
  | "manual"
  | "apple_health"
  | "google_health"
  | "garmin"
  | "fitbit"
  | "amazfit";

/** Tipo de actividad normalizado (independiente del proveedor). */
export type WorkoutType =
  | "walking"
  | "running"
  | "cycling"
  | "swimming"
  | "strength"
  | "hiit"
  | "yoga"
  | "elliptical"
  | "rowing"
  | "other";

/**
 * Entrenamiento normalizado: forma común a la que cada proveedor se traduce.
 * `externalId` permite deduplicar al re-sincronizar (índice único en la BD:
 * user_id + source + external_id).
 */
export interface NormalizedWorkout {
  externalId: string | null;
  source: HealthSource;
  type: WorkoutType;
  name: string | null;
  durationMin: number;
  kcalBurned: number;
  performedAt: string; // ISO 8601
}

/**
 * Interfaz que implementa cada proveedor de salud. Mantener esta abstracción
 * permite añadir Apple/Google/Garmin/Fitbit/Amazfit sin tocar la app: solo se
 * implementa `listWorkouts` con el SDK/OAuth del proveedor y se mapea con los
 * adapters puros de `adapters.ts`.
 */
export interface HealthProvider {
  id: HealthSource;
  label: string;
  /** Devuelve entrenamientos desde `sinceISO`, ya normalizados. */
  listWorkouts(sinceISO: string): Promise<NormalizedWorkout[]>;
}
