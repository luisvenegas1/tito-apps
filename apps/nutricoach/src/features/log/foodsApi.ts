import { supabase } from "@/lib/supabase/client";
import type { Food, FoodSource, LogItem } from "@/lib/supabase/types";

/** Busca alimentos en el catálogo del usuario por nombre. */
export async function searchFoods(userId: string, query: string): Promise<Food[]> {
  let q = supabase.from("foods").select("*").eq("user_id", userId).order("name").limit(30);
  if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Food[];
}

export interface NewFood {
  name: string;
  brand?: string | null;
  barcode?: string | null;
  source?: FoodSource;
  serving_g?: number | null;
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
}

/** Items registrados en los últimos `sinceDays` (para frecuentes/recientes). */
export async function listRecentItems(userId: string, sinceDays = 21): Promise<LogItem[]> {
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("log_items")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return (data ?? []) as LogItem[];
}

/** Busca un alimento ya cacheado por código de barras (para no reconsultar OFF). */
export async function findFoodByBarcode(userId: string, barcode: string): Promise<Food | null> {
  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .eq("user_id", userId)
    .eq("barcode", barcode)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Food) ?? null;
}

/** Crea un alimento personalizado (valores por 100 g). */
export async function createFood(userId: string, f: NewFood): Promise<Food> {
  const { data, error } = await supabase
    .from("foods")
    .insert({
      user_id: userId,
      name: f.name,
      brand: f.brand ?? null,
      barcode: f.barcode ?? null,
      source: f.source ?? "custom",
      serving_g: f.serving_g ?? null,
      kcal: f.kcal,
      protein_g: f.protein_g,
      carb_g: f.carb_g,
      fat_g: f.fat_g,
      fiber_g: f.fiber_g ?? null,
      sugar_g: f.sugar_g ?? null,
      sodium_mg: f.sodium_mg ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Food;
}
