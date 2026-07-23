import { supabase } from "@/lib/supabase/client";
import type { WeightLog, Workout, WorkoutSource } from "@/lib/supabase/types";
import type { NormalizedWorkout } from "@titoapps/health";

/**
 * Rango [inicio, fin) del día LOCAL en UTC (ISO), para filtrar columnas
 * timestamptz correctamente sin importar la zona horaria del usuario.
 * `new Date("YYYY-MM-DDT00:00:00")` (sin Z) se interpreta en hora local.
 */
function localDayRangeUTC(dateISO: string): { start: string; end: string } {
  const start = new Date(`${dateISO}T00:00:00`);
  const end = new Date(start.getTime() + 86_400_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

// ---- Agua ----
export async function addWater(userId: string, ml: number): Promise<void> {
  const { error } = await supabase.from("water_logs").insert({ user_id: userId, ml });
  if (error) throw new Error(error.message);
}

export async function getWaterTotal(userId: string, dateISO: string): Promise<number> {
  const { start, end } = localDayRangeUTC(dateISO);
  const { data, error } = await supabase
    .from("water_logs")
    .select("ml, logged_at")
    .eq("user_id", userId)
    .gte("logged_at", start)
    .lt("logged_at", end);
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((s, r) => s + (r.ml as number), 0);
}

// ---- Peso ----
export async function addWeight(userId: string, weightKg: number): Promise<void> {
  const { error } = await supabase.from("weight_logs").insert({ user_id: userId, weight_kg: weightKg });
  if (error) throw new Error(error.message);
}

export async function getLatestWeight(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("weight_kg")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? (data.weight_kg as number) : null;
}

export async function listWeights(userId: string): Promise<WeightLog[]> {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  return (data ?? []) as WeightLog[];
}

// ---- Entrenamientos ----
export interface NewWorkout {
  type: string;
  name?: string | null;
  duration_min?: number | null;
  kcal_burned: number;
  performed_at?: string;
  source?: WorkoutSource;
}

export async function addWorkout(userId: string, w: NewWorkout): Promise<void> {
  const { error } = await supabase.from("workouts").insert({
    user_id: userId,
    type: w.type,
    name: w.name ?? null,
    duration_min: w.duration_min ?? null,
    kcal_burned: w.kcal_burned,
    performed_at: w.performed_at ?? new Date().toISOString(),
    source: w.source ?? "manual",
  });
  if (error) throw new Error(error.message);
}

export async function getBurnedTotal(userId: string, dateISO: string): Promise<number> {
  const { start, end } = localDayRangeUTC(dateISO);
  const { data, error } = await supabase
    .from("workouts")
    .select("kcal_burned, performed_at")
    .eq("user_id", userId)
    .gte("performed_at", start)
    .lt("performed_at", end);
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((s, r) => s + (r.kcal_burned as number), 0);
}

export async function listWorkouts(userId: string, sinceDays = 14): Promise<Workout[]> {
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .gte("performed_at", since)
    .order("performed_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Workout[];
}

export async function deleteWorkout(id: string): Promise<void> {
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Importa entrenamientos normalizados de un proveedor. Usa upsert con conflicto
 * en (user_id, source, external_id) para que re-sincronizar no duplique.
 * Devuelve cuántas filas se insertaron/actualizaron.
 */
export async function importExternalWorkouts(
  userId: string,
  workouts: NormalizedWorkout[],
): Promise<number> {
  const rows = workouts
    .filter((w) => w.externalId)
    .map((w) => ({
      user_id: userId,
      type: w.type,
      name: w.name,
      duration_min: w.durationMin,
      kcal_burned: w.kcalBurned,
      source: w.source,
      external_id: w.externalId,
      performed_at: w.performedAt,
    }));
  if (rows.length === 0) return 0;
  const { error, count } = await supabase
    .from("workouts")
    .upsert(rows, { onConflict: "user_id,source,external_id", ignoreDuplicates: false, count: "exact" });
  if (error) throw new Error(error.message);
  return count ?? rows.length;
}
