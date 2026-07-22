import { describe, it, expect } from "vitest";
import { mapOffToFood, type OffProduct } from "./openfoodfacts";

// Muestra real recortada de la API v2 (barcode 737628064502, Thai Kitchen).
const sample: OffProduct = {
  product_name: "Thai peanut noodle kit",
  brands: "Simply Asia, Thai Kitchen",
  serving_quantity: 52,
  nutriments: {
    "energy-kcal_100g": 385,
    proteins_100g: 9.62,
    carbohydrates_100g: 71.15,
    fat_100g: 7.69,
    fiber_100g: 1.9,
    sugars_100g: 13.46,
    sodium_100g: 0.288, // gramos por 100 g
  },
};

describe("mapOffToFood", () => {
  const food = mapOffToFood("737628064502", sample);

  it("mapea nombre, marca y barcode", () => {
    expect(food.name).toBe("Thai peanut noodle kit");
    expect(food.brand).toBe("Simply Asia");
    expect(food.barcode).toBe("737628064502");
    expect(food.source).toBe("barcode");
  });

  it("mapea macros por 100 g", () => {
    expect(food.kcal).toBe(385);
    expect(food.protein_g).toBe(9.62);
    expect(food.carb_g).toBe(71.15);
    expect(food.fat_g).toBe(7.69);
    expect(food.fiber_g).toBe(1.9);
    expect(food.sugar_g).toBe(13.46);
  });

  it("convierte sodio de gramos a mg", () => {
    expect(food.sodium_mg).toBe(288);
  });

  it("toma serving_quantity como porción", () => {
    expect(food.serving_g).toBe(52);
  });

  it("usa fallback de nombre si falta", () => {
    const f = mapOffToFood("999", { nutriments: {} });
    expect(f.name).toBe("Producto 999");
    expect(f.kcal).toBe(0);
    expect(f.sodium_mg).toBeNull();
  });
});
