import type { HealthProvider, HealthSource, NormalizedWorkout } from "./types";
import { fromFitbit, type FitbitActivityLog } from "./adapters";

/**
 * Proveedor Fitbit REAL. Consume la Web API de Fitbit con un access token
 * (obtenido por OAuth 2.0 fuera de este paquete) y normaliza con `fromFitbit`.
 *
 * La adquisición del token (OAuth) se implementa en el flujo de la app/Edge
 * Function; este paquete solo necesita el token ya emitido. Esto mantiene el
 * paquete puro y testeable (se le puede inyectar un `fetch` mock).
 */
export class FitbitProvider implements HealthProvider {
  id: HealthSource = "fitbit";
  label = "Fitbit";

  constructor(
    private accessToken: string,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async listWorkouts(sinceISO: string): Promise<NormalizedWorkout[]> {
    const afterDate = sinceISO.slice(0, 10);
    const url =
      "https://api.fitbit.com/1/user/-/activities/list.json" +
      `?afterDate=${afterDate}&sort=asc&offset=0&limit=50`;
    const res = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) throw new Error(`Fitbit ${res.status}: ${await res.text()}`);
    const data: { activities?: FitbitActivityLog[] } = await res.json();
    return (data.activities ?? []).map(fromFitbit);
  }
}
