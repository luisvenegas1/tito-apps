import { supabase } from "@/lib/supabase/client";
import type { LogItem, Meal, LogItemSource } from "@/lib/supabase/types";

/** Devuelve el food_log del día, creándolo si no existe. */
export async function getOrCreateDayLog(userId: string, logDate: string): Promise<string> {
  const { data, error } = await supabase
    .from("food_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("log_date", logDate)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data.id as string;

  const { data: created, error: insErr } = await supabase
    .from("food_logs")
    .insert({ user_id: userId, log_date: logDate })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);
  return created.id as string;
}

export async function listLogItems(userId: string, logDate: string): Promise<LogItem[]> {
  const logId = await getOrCreateDayLog(userId, logDate);
  const { data, error } = await supabase
    .from("log_items")
    .select("*")
    .eq("food_log_id", logId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as LogItem[];
}

export interface NewLogItem {
  food_id?: string | null;
  name: string;
  grams: number;
  meal: Meal;
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
  source: LogItemSource;
  confidence?: number | null;
}

export async function addLogItems(
  userId: string,
  logDate: string,
  items: NewLogItem[],
): Promise<LogItem[]> {
  const logId = await getOrCreateDayLog(userId, logDate);
  const rows = items.map((i) => ({
    food_log_id: logId,
    user_id: userId,
    food_id: i.food_id ?? null,
    name: i.name,
    grams: i.grams,
    meal: i.meal,
    kcal: i.kcal,
    protein_g: i.protein_g,
    carb_g: i.carb_g,
    fat_g: i.fat_g,
    fiber_g: i.fiber_g ?? null,
    sugar_g: i.sugar_g ?? null,
    sodium_mg: i.sodium_mg ?? null,
    source: i.source,
    confidence: i.confidence ?? null,
  }));
  const { data, error } = await supabase.from("log_items").insert(rows).select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as LogItem[];
}

export async function deleteLogItem(id: string): Promise<void> {
  const { error } = await supabase.from("log_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type LogItemPatch = Partial<
  Pick<LogItem, "grams" | "kcal" | "protein_g" | "carb_g" | "fat_g" | "fiber_g" | "sugar_g" | "sodium_mg">
>;

/** Actualiza una comida ya registrada (ej. cambiar la cantidad y reescalar macros). */
export async function updateLogItem(id: string, patch: LogItemPatch): Promise<void> {
  const { error } = await supabase.from("log_items").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}
