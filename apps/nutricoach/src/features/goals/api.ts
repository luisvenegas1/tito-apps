import { supabase } from "@/lib/supabase/client";
import type { Goal } from "@/lib/supabase/types";
import type { DailyTargets, GoalType } from "@titoapps/nutrition";

/** Objetivo activo del usuario (o null si aún no configuró). */
export async function getActiveGoal(userId: string): Promise<Goal | null> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Goal) ?? null;
}

export interface SaveGoalInput {
  type: GoalType;
  target_weight_kg: number | null;
  rate_kg_per_week: number | null;
  targets: DailyTargets;
}

/**
 * Guarda el objetivo activo: desactiva los anteriores e inserta el nuevo.
 * (Un solo goal activo por usuario — índice único parcial en la BD.)
 */
export async function saveGoal(userId: string, input: SaveGoalInput): Promise<Goal> {
  await supabase.from("goals").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);

  const { data, error } = await supabase
    .from("goals")
    .insert({
      user_id: userId,
      type: input.type,
      target_weight_kg: input.target_weight_kg,
      rate_kg_per_week: input.rate_kg_per_week,
      calorie_target: input.targets.calorie_target,
      protein_g: input.targets.protein_g,
      carb_g: input.targets.carb_g,
      fat_g: input.targets.fat_g,
      fiber_g: input.targets.fiber_g,
      water_ml: input.targets.water_ml,
      is_active: true,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Goal;
}
