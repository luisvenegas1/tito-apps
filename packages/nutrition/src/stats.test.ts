import { describe, it, expect } from "vitest";
import { adaptiveMaintenance, adherence, loggingStreak, average, daysBetween } from "./stats";
import type { DailyTargets } from "./types";

describe("average / daysBetween", () => {
  it("promedia", () => expect(average([2, 4, 6])).toBe(4));
  it("días entre fechas", () => expect(daysBetween("2026-07-01", "2026-07-15")).toBe(14));
});

describe("adaptiveMaintenance", () => {
  it("estima TDEE cuando se pierde peso comiendo por debajo", () => {
    // 14 días comiendo 2000 kcal, peso baja 1 kg → TDEE ≈ 2000 + 550 = 2550
    const intake = Array.from({ length: 15 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      kcal: 2000,
    }));
    const weights = [
      { date: "2026-07-01", kg: 80 },
      { date: "2026-07-15", kg: 79 },
    ];
    expect(adaptiveMaintenance(intake, weights)).toBe(2550);
  });

  it("da mantenimiento = ingesta si el peso no cambia", () => {
    const intake = Array.from({ length: 15 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      kcal: 2200,
    }));
    const weights = [
      { date: "2026-07-01", kg: 75 },
      { date: "2026-07-15", kg: 75 },
    ];
    expect(adaptiveMaintenance(intake, weights)).toBe(2200);
  });

  it("null con datos insuficientes", () => {
    expect(adaptiveMaintenance([], [{ date: "2026-07-01", kg: 80 }])).toBeNull();
    expect(
      adaptiveMaintenance(
        [{ date: "2026-07-01", kcal: 2000 }],
        [
          { date: "2026-07-01", kg: 80 },
          { date: "2026-07-03", kg: 79 },
        ],
      ),
    ).toBeNull(); // ventana < 7 días
  });
});

const targets: DailyTargets = {
  calorie_target: 2000,
  protein_g: 160,
  carb_g: 200,
  fat_g: 60,
  fiber_g: 28,
  water_ml: 2800,
};

describe("adherence", () => {
  it("calcula % de días dentro de meta", () => {
    const days = [
      { kcal: 2000, protein_g: 160 }, // on
      { kcal: 1950, protein_g: 150 }, // on (dentro de ±10%)
      { kcal: 1500, protein_g: 100 }, // off
      { kcal: 0, protein_g: 0 }, // no registrado (ignorado)
    ];
    const r = adherence(days, targets);
    expect(r.loggedDays).toBe(3);
    expect(r.onTargetDays).toBe(2);
    expect(r.adherencePct).toBe(67);
  });
});

describe("loggingStreak", () => {
  it("cuenta días consecutivos desde el final", () => {
    expect(loggingStreak([{ kcal: 1 }, { kcal: 0 }, { kcal: 1 }, { kcal: 1 }])).toBe(2);
    expect(loggingStreak([{ kcal: 0 }])).toBe(0);
  });
});
