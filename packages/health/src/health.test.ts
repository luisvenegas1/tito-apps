import { describe, it, expect } from "vitest";
import { estimateCalories } from "./met";
import { fromAppleHealth, fromGarmin, normalizeType } from "./adapters";
import { dedupeByExternalId } from "./dedupe";
import { MockWearableProvider } from "./providers";
import { FitbitProvider } from "./fitbit";
import { StravaProvider } from "./strava";
import { fromStrava } from "./adapters";
import type { NormalizedWorkout } from "./types";

describe("estimateCalories", () => {
  it("usa la fórmula MET (correr 30 min, 70 kg ≈ 360 kcal)", () => {
    expect(estimateCalories("running", 30, 70)).toBe(360);
  });
  it("escala con el peso", () => {
    expect(estimateCalories("running", 30, 90)).toBeGreaterThan(estimateCalories("running", 30, 70));
  });
  it("0 si la duración es 0", () => {
    expect(estimateCalories("cycling", 0, 70)).toBe(0);
  });
});

describe("normalizeType", () => {
  it("mapea claves de proveedor", () => {
    expect(normalizeType("HKWorkoutActivityTypeRunning")).toBe("running");
    expect(normalizeType("Indoor Cycling")).toBe("cycling");
    expect(normalizeType("weight_training")).toBe("strength");
    expect(normalizeType("desconocido")).toBe("other");
  });
});

describe("adapters", () => {
  it("normaliza una muestra de Apple Health (segundos → minutos)", () => {
    const w = fromAppleHealth({
      uuid: "abc",
      workoutActivityType: "HKWorkoutActivityTypeRunning",
      duration: 1800,
      totalEnergyBurned: 350,
      startDate: "2026-07-20T07:00:00.000Z",
    });
    expect(w).toMatchObject({ externalId: "abc", source: "apple_health", type: "running", durationMin: 30, kcalBurned: 350 });
  });
  it("normaliza una actividad de Garmin (typeKey anidado)", () => {
    const w = fromGarmin({ activityId: 42, activityType: { typeKey: "lap_swimming" }, duration: 600, calories: 120 });
    expect(w.type).toBe("swimming");
    expect(w.externalId).toBe("42");
    expect(w.durationMin).toBe(10);
  });
});

describe("dedupeByExternalId", () => {
  const mk = (externalId: string | null): NormalizedWorkout => ({
    externalId,
    source: "garmin",
    type: "running",
    name: null,
    durationMin: 20,
    kcalBurned: 200,
    performedAt: "2026-07-20T07:00:00.000Z",
  });

  it("descarta los ya importados y los duplicados del lote", () => {
    const incoming = [mk("a"), mk("b"), mk("b"), mk(null)];
    const out = dedupeByExternalId(incoming, ["a"]);
    expect(out.map((w) => w.externalId)).toEqual(["b", null]);
  });
});

describe("MockWearableProvider", () => {
  it("devuelve entrenamientos normalizados con externalId estable", async () => {
    const provider = new MockWearableProvider();
    const list = await provider.listWorkouts("2026-01-01");
    expect(list.length).toBe(2);
    expect(list[0].externalId).toBe("demo-run-1");
  });
});

describe("FitbitProvider", () => {
  it("consume la API con el token y normaliza la respuesta (fetch mock)", async () => {
    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string>)?.Authorization;
      expect(String(url)).toContain("api.fitbit.com");
      expect(auth).toBe("Bearer token-123");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          activities: [
            { logId: 777, activityName: "Run", duration: 1800000, calories: 300, startTime: "2026-07-20T06:30:00.000" },
          ],
        }),
      } as Response;
    }) as typeof fetch;

    const provider = new FitbitProvider("token-123", mockFetch);
    const list = await provider.listWorkouts("2026-07-01T00:00:00.000Z");
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ source: "fitbit", type: "running", externalId: "777", durationMin: 30, kcalBurned: 300 });
  });
});

describe("fromStrava / StravaProvider (ruta Amazfit + Apple Watch)", () => {
  it("mapea una actividad de Strava y respeta la fuente atribuida", () => {
    const w = fromStrava(
      { id: 999, name: "Bici de tarde", sport_type: "Ride", moving_time: 2700, calories: 410, start_date: "2026-07-20T18:00:00Z" },
      "amazfit",
    );
    expect(w).toMatchObject({ source: "amazfit", type: "cycling", externalId: "999", durationMin: 45, kcalBurned: 410 });
  });

  it("consume la API de Strava con el token (fetch mock)", async () => {
    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toContain("strava.com/api/v3/athlete/activities");
      expect((init?.headers as Record<string, string>)?.Authorization).toBe("Bearer strava-tok");
      return {
        ok: true,
        status: 200,
        json: async () => [{ id: 1, name: "Run", sport_type: "Run", moving_time: 1800, calories: 300, start_date: "2026-07-20T06:00:00Z" }],
      } as Response;
    }) as typeof fetch;

    const provider = new StravaProvider("strava-tok", "amazfit", mockFetch);
    const list = await provider.listWorkouts("2026-07-01T00:00:00.000Z");
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ source: "amazfit", type: "running", externalId: "1" });
  });
});
