import { describe, it, expect } from "vitest";
import { topFrequent, groupFrequents } from "./frequents";
import type { LogItem } from "@/lib/supabase/types";

function item(name: string, created_at: string, food_id: string | null = null): LogItem {
  return {
    id: name + created_at,
    food_log_id: "l",
    user_id: "u",
    food_id,
    name,
    grams: 100,
    meal: "lunch",
    kcal: 100,
    protein_g: 10,
    carb_g: 5,
    fat_g: 2,
    fiber_g: null,
    sugar_g: null,
    sodium_mg: null,
    source: "search",
    confidence: null,
    created_at,
  };
}

describe("groupFrequents / topFrequent", () => {
  const items = [
    item("Pollo", "2026-07-20"),
    item("Pollo", "2026-07-19"),
    item("Arroz", "2026-07-18"),
    item("pollo", "2026-07-10"), // mismo nombre, distinta capitalización
  ];

  it("agrupa por nombre normalizado", () => {
    const g = groupFrequents(items);
    const pollo = g.find((e) => e.name.toLowerCase() === "pollo");
    expect(pollo?.count).toBe(3);
  });

  it("ordena por frecuencia y guarda el último snapshot", () => {
    const top = topFrequent(items, 2);
    expect(top[0].name).toBe("Pollo");
    expect(top[0].last.created_at).toBe("2026-07-20"); // más reciente
    expect(top.length).toBe(2);
  });
});
