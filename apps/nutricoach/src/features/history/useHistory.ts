import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  adherence,
  loggingStreak,
  adaptiveMaintenance,
  type AdherenceResult,
  type DailyTargets,
} from "@titoapps/nutrition";
import { fetchDayTotals, type DayTotal } from "./api";
import { listWeights } from "@/features/health/api";
import { getActiveGoal } from "@/features/goals/api";
import { todayISO } from "@/lib/date";

export interface HistoryData {
  days: DayTotal[]; // 30 días, del más antiguo al más reciente
  weights: { date: string; kg: number }[];
  targets: DailyTargets | null;
  adherence: AdherenceResult | null;
  streak: number;
  maintenance: number | null;
}

/** Datos del historial (30 días) + métricas derivadas del motor. */
export function useHistory() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery<HistoryData>({
    queryKey: ["history", 30],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const [days, weightLogs, goal] = await Promise.all([
        fetchDayTotals(userId!, 30),
        listWeights(userId!),
        getActiveGoal(userId!),
      ]);

      const weights = [...weightLogs]
        .map((w) => ({ date: todayISO(new Date(w.logged_at)), kg: w.weight_kg }))
        .reverse(); // cronológico

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

      const intake = days.map((d) => ({ date: d.date, kcal: d.macros.kcal }));

      return {
        days,
        weights,
        targets,
        adherence: targets ? adherence(days.map((d) => d.macros), targets) : null,
        streak: loggingStreak(days.map((d) => d.macros)),
        maintenance: adaptiveMaintenance(intake, weights),
      };
    },
  });
}
