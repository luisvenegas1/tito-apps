import type { HealthProvider, HealthSource, NormalizedWorkout } from "./types";

/** Metadatos de los proveedores soportados (para la UI de conexión). */
export interface ProviderInfo {
  id: HealthSource;
  label: string;
  /** true cuando el adapter de sincronización real ya está implementado. */
  available: boolean;
}

export const PROVIDERS: ProviderInfo[] = [
  { id: "apple_health", label: "Apple Health", available: false },
  { id: "google_health", label: "Google Health", available: false },
  { id: "garmin", label: "Garmin", available: false },
  { id: "fitbit", label: "Fitbit", available: false },
  { id: "amazfit", label: "Amazfit / Zepp", available: false },
];

/**
 * Proveedor de demostración: devuelve entrenamientos de ejemplo con externalId
 * estable, para probar el pipeline de importación + dedupe de punta a punta sin
 * OAuth ni dispositivos reales. Los adapters reales reemplazan esta clase.
 */
export class MockWearableProvider implements HealthProvider {
  id: HealthSource = "garmin";
  label = "Wearable (demo)";

  async listWorkouts(_sinceISO: string): Promise<NormalizedWorkout[]> {
    const today = new Date();
    const iso = (h: number) => {
      const d = new Date(today);
      d.setHours(h, 0, 0, 0);
      return d.toISOString();
    };
    return [
      {
        externalId: "demo-run-1",
        source: "garmin",
        type: "running",
        name: "Trote matutino",
        durationMin: 32,
        kcalBurned: 340,
        performedAt: iso(7),
      },
      {
        externalId: "demo-strength-1",
        source: "garmin",
        type: "strength",
        name: "Pesas",
        durationMin: 45,
        kcalBurned: 260,
        performedAt: iso(18),
      },
    ];
  }
}
