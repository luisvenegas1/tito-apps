import { supabase } from "@/lib/supabase/client";
import { sumMacros, type Macros } from "@titoapps/nutrition";
import { todayISO } from "@/lib/date";

export interface DayTotal {
  date: string; // YYYY-MM-DD
  macros: Macros;
}

interface FoodLogRow {
  log_date: string;
  log_items: Array<Pick<Macros, "kcal" | "protein_g" | "carb_g" | "fat_g" | "fiber_g" | "sugar_g" | "sodium_mg">>;
}

/**
 * Totales diarios de los últimos `sinceDays` días. Trae food_logs con sus items
 * embebidos (una sola consulta) y suma por día con @titoapps/nutrition.
 * Rellena los días sin registro con macros en cero para gráficas continuas.
 */
export async function fetchDayTotals(userId: string, sinceDays = 30): Promise<DayTotal[]> {
  const sinceDate = todayISO(new Date(Date.now() - (sinceDays - 1) * 86_400_000));
  const { data, error } = await supabase
    .from("food_logs")
    .select("log_date, log_items(kcal,protein_g,carb_g,fat_g,fiber_g,sugar_g,sodium_mg)")
    .eq("user_id", userId)
    .gte("log_date", sinceDate)
    .order("log_date");
  if (error) throw new Error(error.message);

  const byDate = new Map<string, Macros>();
  for (const row of (data ?? []) as FoodLogRow[]) {
    byDate.set(row.log_date, sumMacros(row.log_items as Macros[]));
  }

  const out: DayTotal[] = [];
  for (let i = sinceDays - 1; i >= 0; i--) {
    const date = todayISO(new Date(Date.now() - i * 86_400_000));
    out.push({ date, macros: byDate.get(date) ?? { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 } });
  }
  return out;
}
