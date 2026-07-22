import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/query";
import { useAuth } from "@/features/auth/AuthProvider";
import { todayISO } from "@/lib/date";
import { sumMacros, computeRemaining, type DailyTargets, type Macros } from "@titoapps/nutrition";
import { listLogItems } from "@/features/log/api";
import { getActiveGoal } from "@/features/goals/api";
import { getWaterTotal, getLatestWeight, getBurnedTotal } from "@/features/health/api";
import type { LogItem } from "@/lib/supabase/types";

export interface DashboardData {
  targets: DailyTargets | null;
  goalType: string | null;
  targetWeightKg: number | null;
  consumed: Macros;
  remaining: ReturnType<typeof computeRemaining> | null;
  items: LogItem[];
  waterMl: number;
  kcalBurned: number;
  weightKg: number | null;
}

/** Agrega todo lo que el dashboard necesita en una sola query. */
export function useDashboard(date = todayISO()) {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery<DashboardData>({
    queryKey: qk.dashboard(date),
    enabled: !!userId,
    queryFn: async () => {
      const [items, goal, waterMl, weightKg, kcalBurned] = await Promise.all([
        listLogItems(userId!, date),
        getActiveGoal(userId!),
        getWaterTotal(userId!, date),
        getLatestWeight(userId!),
        getBurnedTotal(userId!, date),
      ]);

      const consumed = sumMacros(items);
      const targets: DailyTargets | null = goal
        ? {
            calorie_target: goal.calorie_target,
            protein_g: goal.protein_g,
            carb_g: goal.carb_g,
            fat_g: goal.fat_g,
            fiber_g: goal.fiber_g ?? 0,
            water_ml: goal.water_ml ?? 0,
          }
        : null;

      return {
        targets,
        goalType: goal?.type ?? null,
        targetWeightKg: goal?.target_weight_kg ?? null,
        consumed,
        remaining: targets ? computeRemaining(targets, consumed) : null,
        items,
        waterMl,
        kcalBurned,
        weightKg,
      };
    },
  });
}
