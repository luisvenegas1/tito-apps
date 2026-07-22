import { describe, it, expect } from "vitest";
import {
  scaleMacros,
  sumMacros,
  computeRemaining,
  caloriePercent,
  gaugeZone,
  qualityScore,
} from "./macros";
import type { DailyTargets, Per100g } from "./types";

const chicken: Per100g = {
  kcal: 165,
  protein_g: 31,
  carb_g: 0,
  fat_g: 3.6,
  fiber_g: 0,
  sugar_g: 0,
  sodium_mg: 74,
};

describe("scaleMacros", () => {
  it("escala por gramos correctamente", () => {
    const m = scaleMacros(chicken, 200);
    expect(m.kcal).toBe(330);
    expect(m.protein_g).toBe(62);
    expect(m.sodium_mg).toBe(148);
  });
  it("maneja fracciones", () => {
    const m = scaleMacros(chicken, 150);
    expect(m.kcal).toBe(248); // 165*1.5 = 247.5 -> 248
    expect(m.protein_g).toBeCloseTo(46.5, 1);
  });
});

describe("sumMacros", () => {
  it("suma varios items", () => {
    const total = sumMacros([scaleMacros(chicken, 100), scaleMacros(chicken, 100)]);
    expect(total.kcal).toBe(330);
    expect(total.protein_g).toBe(62);
  });
  it("devuelve ceros para lista vacía", () => {
    expect(sumMacros([]).kcal).toBe(0);
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

describe("computeRemaining", () => {
  it("resta lo consumido de la meta", () => {
    const r = computeRemaining(targets, { kcal: 1500, protein_g: 120, carb_g: 150, fat_g: 40, fiber_g: 10 });
    expect(r.kcal).toBe(500);
    expect(r.protein_g).toBe(40);
    expect(r.fiber_g).toBe(18);
  });
  it("permite kcal negativo (exceso)", () => {
    const r = computeRemaining(targets, { kcal: 2200, protein_g: 0, carb_g: 0, fat_g: 0 });
    expect(r.kcal).toBe(-200);
  });
});

describe("caloriePercent + gaugeZone", () => {
  it("mapea porcentajes a zonas de color", () => {
    expect(gaugeZone(caloriePercent(targets, { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 }))).toBe("green");
    expect(gaugeZone(caloriePercent(targets, { kcal: 1500, protein_g: 0, carb_g: 0, fat_g: 0 }))).toBe("yellow");
    expect(gaugeZone(caloriePercent(targets, { kcal: 1900, protein_g: 0, carb_g: 0, fat_g: 0 }))).toBe("orange");
    expect(gaugeZone(caloriePercent(targets, { kcal: 2100, protein_g: 0, carb_g: 0, fat_g: 0 }))).toBe("red");
  });
});

describe("qualityScore", () => {
  it("premia comida rica en proteína", () => {
    const highProtein = qualityScore(scaleMacros(chicken, 200));
    const sugary = qualityScore({ kcal: 300, protein_g: 2, carb_g: 70, fat_g: 5, sugar_g: 60, sodium_mg: 200 });
    expect(highProtein).toBeGreaterThan(sugary);
  });
  it("está acotado a 0–100", () => {
    const s = qualityScore(scaleMacros(chicken, 500));
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});
