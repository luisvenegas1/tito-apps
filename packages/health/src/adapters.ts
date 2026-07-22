import type { NormalizedWorkout, WorkoutType } from "./types";

/** Mapea un texto/clave de actividad de cualquier proveedor a nuestro WorkoutType. */
export function normalizeType(raw: string | number | undefined | null): WorkoutType {
  const s = String(raw ?? "").toLowerCase();
  if (/run|jog|treadmill/.test(s)) return "running";
  if (/walk|hik/.test(s)) return "walking";
  if (/cycl|bike|biking|spinning|ride|ebikeride|virtualride/.test(s)) return "cycling";
  if (/swim/.test(s)) return "swimming";
  if (/strength|weight|resistance|gym/.test(s)) return "strength";
  if (/hiit|interval/.test(s)) return "hiit";
  if (/yoga|pilates|stretch/.test(s)) return "yoga";
  if (/elliptical|cross.?trainer/.test(s)) return "elliptical";
  if (/row/.test(s)) return "rowing";
  return "other";
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

// ---------- Apple Health (HealthKit) ----------
export interface AppleWorkoutSample {
  uuid?: string;
  workoutActivityType?: string;
  duration?: number; // segundos
  totalEnergyBurned?: number; // kcal
  startDate?: string;
}
export function fromAppleHealth(s: AppleWorkoutSample): NormalizedWorkout {
  return {
    externalId: s.uuid ?? null,
    source: "apple_health",
    type: normalizeType(s.workoutActivityType),
    name: null,
    durationMin: Math.round(num(s.duration) / 60),
    kcalBurned: Math.round(num(s.totalEnergyBurned)),
    performedAt: s.startDate ?? new Date().toISOString(),
  };
}

// ---------- Google Health / Fit ----------
export interface GoogleSession {
  id?: string;
  name?: string;
  activityType?: string | number;
  startTimeMillis?: number | string;
  endTimeMillis?: number | string;
  calories?: number;
}
export function fromGoogleHealth(s: GoogleSession): NormalizedWorkout {
  const start = num(s.startTimeMillis);
  const end = num(s.endTimeMillis);
  return {
    externalId: s.id ?? null,
    source: "google_health",
    type: normalizeType(s.activityType),
    name: s.name ?? null,
    durationMin: end > start ? Math.round((end - start) / 60000) : 0,
    kcalBurned: Math.round(num(s.calories)),
    performedAt: start ? new Date(start).toISOString() : new Date().toISOString(),
  };
}

// ---------- Garmin ----------
export interface GarminActivity {
  activityId?: string | number;
  activityType?: { typeKey?: string } | string;
  duration?: number; // segundos
  calories?: number;
  startTimeGMT?: string;
}
export function fromGarmin(a: GarminActivity): NormalizedWorkout {
  const typeKey = typeof a.activityType === "object" ? a.activityType?.typeKey : a.activityType;
  return {
    externalId: a.activityId != null ? String(a.activityId) : null,
    source: "garmin",
    type: normalizeType(typeKey),
    name: null,
    durationMin: Math.round(num(a.duration) / 60),
    kcalBurned: Math.round(num(a.calories)),
    performedAt: a.startTimeGMT ?? new Date().toISOString(),
  };
}

// ---------- Fitbit ----------
export interface FitbitActivityLog {
  logId?: string | number;
  activityName?: string;
  duration?: number; // milisegundos
  calories?: number;
  startTime?: string;
}
export function fromFitbit(a: FitbitActivityLog): NormalizedWorkout {
  return {
    externalId: a.logId != null ? String(a.logId) : null,
    source: "fitbit",
    type: normalizeType(a.activityName),
    name: a.activityName ?? null,
    durationMin: Math.round(num(a.duration) / 60000),
    kcalBurned: Math.round(num(a.calories)),
    performedAt: a.startTime ?? new Date().toISOString(),
  };
}

// ---------- Strava (agregador: cubre Amazfit, Apple Watch, Garmin…) ----------
// La app Zepp (Amazfit) y el Apple Watch sincronizan sus actividades a Strava,
// que sí ofrece una API pública OAuth apta para web. Por eso Strava es la vía
// recomendada para conectar dispositivos que no exponen API propia.
export interface StravaActivity {
  id?: number | string;
  name?: string;
  sport_type?: string;
  type?: string;
  elapsed_time?: number; // segundos
  moving_time?: number; // segundos
  calories?: number;
  start_date?: string;
}
export function fromStrava(a: StravaActivity, source: NormalizedWorkout["source"] = "amazfit"): NormalizedWorkout {
  const seconds = num(a.moving_time) || num(a.elapsed_time);
  return {
    externalId: a.id != null ? String(a.id) : null,
    source,
    type: normalizeType(a.sport_type ?? a.type),
    name: a.name ?? null,
    durationMin: Math.round(seconds / 60),
    kcalBurned: Math.round(num(a.calories)),
    performedAt: a.start_date ?? new Date().toISOString(),
  };
}
