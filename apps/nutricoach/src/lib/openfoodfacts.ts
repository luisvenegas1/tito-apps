import type { NewFood } from "@/features/log/foodsApi";

/**
 * Cliente de Open Food Facts (API v2). Gratuito, sin claves.
 * El mapeo a nuestro tipo `NewFood` es una función PURA (testeada).
 */

export interface OffNutriments {
  "energy-kcal_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
  sodium_100g?: number; // en GRAMOS por 100 g
  [key: string]: number | undefined;
}

export interface OffProduct {
  product_name?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: OffNutriments;
}

export interface OffResponse {
  status: number; // 1 = encontrado, 0 = no
  code?: string;
  product?: OffProduct;
}

const n = (v: number | string | undefined): number | undefined => {
  if (v == null) return undefined;
  const x = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(x) ? x : undefined;
};

/**
 * Mapea un producto de Open Food Facts a nuestro alimento (valores por 100 g).
 * OFF entrega el sodio en gramos por 100 g → lo convertimos a mg.
 * Función pura para poder testearla sin red.
 */
export function mapOffToFood(barcode: string, product: OffProduct): NewFood {
  const nut = product.nutriments ?? {};
  const sodiumG = n(nut.sodium_100g);
  return {
    name: product.product_name?.trim() || `Producto ${barcode}`,
    brand: product.brands?.split(",")[0]?.trim() || null,
    barcode,
    source: "barcode",
    serving_g: n(product.serving_quantity) ?? null,
    kcal: n(nut["energy-kcal_100g"]) ?? 0,
    protein_g: n(nut.proteins_100g) ?? 0,
    carb_g: n(nut.carbohydrates_100g) ?? 0,
    fat_g: n(nut.fat_100g) ?? 0,
    fiber_g: n(nut.fiber_100g) ?? null,
    sugar_g: n(nut.sugars_100g) ?? null,
    sodium_mg: sodiumG != null ? Math.round(sodiumG * 1000) : null,
  };
}

/** Busca un producto por código de barras. Devuelve NewFood o null si no existe. */
export async function fetchProductByBarcode(barcode: string): Promise<NewFood | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
    barcode,
  )}.json?fields=code,product_name,brands,serving_quantity,nutriments`;
  const res = await fetch(url, { headers: { "User-Agent": "NutriCoach/1.0 (Tito Apps)" } });
  if (!res.ok) throw new Error(`Open Food Facts ${res.status}`);
  const data: OffResponse = await res.json();
  if (data.status !== 1 || !data.product) return null;
  return mapOffToFood(barcode, data.product);
}
