import type { HealthProvider, HealthSource, NormalizedWorkout } from "./types";
import { fromStrava, type StravaActivity } from "./adapters";

/**
 * Proveedor Strava REAL. Es la vía recomendada para dispositivos que no exponen
 * API propia para la web: Amazfit (vía app Zepp) y Apple Watch sincronizan sus
 * actividades a Strava, y Strava sí tiene una API pública OAuth.
 *
 * Recibe un access token ya emitido (el flujo OAuth 2.0 vive en la app/Edge
 * Function). Puro y testeable: se le puede inyectar un `fetch` mock.
 *
 * `attributedSource` permite etiquetar de dónde viene realmente la actividad
 * (p. ej. "amazfit" o "apple_health") para mostrarlo en la UI.
 */
export class StravaProvider implements HealthProvider {
  id: HealthSource;
  label: string;

  constructor(
    private accessToken: string,
    private attributedSource: HealthSource = "amazfit",
    private fetchImpl: typeof fetch = fetch,
  ) {
    this.id = attributedSource;
    this.label = attributedSource === "amazfit" ? "Amazfit (vía Strava)" : "Strava";
  }

  async listWorkouts(sinceISO: string): Promise<NormalizedWorkout[]> {
    const after = Math.floor(new Date(sinceISO).getTime() / 1000);
    const url = `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50`;
    const res = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) throw new Error(`Strava ${res.status}: ${await res.text()}`);
    const data: StravaActivity[] = await res.json();
    return (data ?? []).map((a) => fromStrava(a, this.attributedSource));
  }
}
