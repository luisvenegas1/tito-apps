import { describe, it, expect } from "vitest";
import { rankMealIdeas, suggestPortion } from "./ideas";
import type { FoodCandidate, Remaining } from "./index";

const chicken: FoodCandidate = { name: "Pollo", kcal: 165, protein_g: 31, carb_g: 0, fat_g: 3.6 };
const rice: FoodCandidate = { name: "Arroz", kcal: 130, protein_g: 2.7, carb_g: 28, fat_g: 0.3 };
const almonds: FoodCandidate = { name: "Almendras", kcal: 579, protein_g: 21, carb_g: 22, fat_g: 50 };

const remaining: Remaining = { kcal: 600, protein_g: 40, carb_g: 30, fat_g: 15, fiber_g: 8 };

describe("suggestPortion", () => {
  it("propone una porción dentro de rango y múltiplo de 10", () => {
    const g = suggestPortion(remaining, chicken);
    expect(g).toBeGreaterThanOrEqual(30);
    expect(g).toBeLessThanOrEqual(400);
    expect(g % 10).toBe(0);
  });
  it("no excede las calorías restantes", () => {
    const g = suggestPortion(remaining, almonds);
    expect((almonds.kcal * g) / 100).toBeLessThanOrEqual(remaining.kcal + 1);
  });
});

describe("rankMealIdeas", () => {
  it("prioriza alimentos altos en proteína cuando falta proteína", () => {
    const ideas = rankMealIdeas(remaining, [rice, chicken, almonds]);
    expect(ideas[0].name).toBe("Pollo");
    expect(ideas.length).toBeLessThanOrEqual(4);
  });
  it("cada idea trae macros calculados", () => {
    const [top] = rankMealIdeas(remaining, [chicken]);
    expect(top.macros.kcal).toBeGreaterThan(0);
    expect(top.macros.protein_g).toBeGreaterThan(0);
  });
});
