import { describe, it, expect } from "vitest";
import {
  bmrMifflinStJeor,
  tdee,
  calorieDeltaForGoal,
  computeDailyTargets,
} from "./energy";
import type { EnergyProfile } from "./types";

const male: EnergyProfile = {
  sex: "male",
  age: 30,
  height_cm: 180,
  weight_kg: 80,
  activity: "moderate",
};

describe("bmrMifflinStJeor", () => {
  it("calcula el BMR masculino (Mifflin-St Jeor)", () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(bmrMifflinStJeor(male)).toBe(1780);
  });

  it("aplica la constante femenina (-161)", () => {
    const female: EnergyProfile = { ...male, sex: "female" };
    // 1780 - 5 (quita +5) - 161 = 1614
    expect(bmrMifflinStJeor(female)).toBe(1614);
  });
});

describe("tdee", () => {
  it("multiplica el BMR por el factor de actividad", () => {
    // 1780 * 1.55 = 2759
    expect(tdee(male)).toBe(2759);
  });
});

describe("calorieDeltaForGoal", () => {
  it("resta calorías para bajar grasa", () => {
    expect(calorieDeltaForGoal("lose_fat", 2759, 0.5)).toBeLessThan(0);
  });
  it("suma (menos) para ganar músculo", () => {
    const d = calorieDeltaForGoal("gain_muscle", 2759, 0.5);
    expect(d).toBeGreaterThan(0);
  });
  it("es 0 para mantener", () => {
    expect(calorieDeltaForGoal("maintain", 2759)).toBe(0);
  });
});

describe("computeDailyTargets", () => {
  it("produce metas coherentes para bajar grasa", () => {
    const t = computeDailyTargets({ profile: male, goal: "lose_fat" });
    expect(t.calorie_target).toBeLessThan(tdee(male));
    expect(t.protein_g).toBe(160); // 2.0 * 80
    expect(t.fat_g).toBe(72); // 0.9 * 80
    expect(t.carb_g).toBeGreaterThan(0);
    // Los macros deben aproximar la meta calórica (±5%).
    const kcalFromMacros = t.protein_g * 4 + t.carb_g * 4 + t.fat_g * 9;
    expect(Math.abs(kcalFromMacros - t.calorie_target)).toBeLessThan(t.calorie_target * 0.05);
  });

  it("respeta el piso de seguridad de 1200 kcal", () => {
    const tiny: EnergyProfile = { sex: "female", age: 60, height_cm: 150, weight_kg: 45, activity: "sedentary" };
    const t = computeDailyTargets({ profile: tiny, goal: "deficit", rateKgPerWeek: 1 });
    expect(t.calorie_target).toBeGreaterThanOrEqual(1200);
  });
});
