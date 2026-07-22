import { supabase } from "@/lib/supabase/client";
import type { LogItem, WeightLog, Workout } from "@/lib/supabase/types";

export interface ExportBundle {
  exportedAt: string;
  logItems: LogItem[];
  weights: WeightLog[];
  workouts: Workout[];
}

async function fetchAll<T>(table: string, userId: string, orderBy: string): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .order(orderBy, { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

/** Descarga todos los datos del usuario para exportar (portabilidad de datos). */
export async function fetchExportBundle(userId: string): Promise<ExportBundle> {
  const [logItems, weights, workouts] = await Promise.all([
    fetchAll<LogItem>("log_items", userId, "created_at"),
    fetchAll<WeightLog>("weight_logs", userId, "logged_at"),
    fetchAll<Workout>("workouts", userId, "performed_at"),
  ]);
  return { exportedAt: new Date().toISOString(), logItems, weights, workouts };
}
