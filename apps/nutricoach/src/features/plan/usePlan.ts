import { useMutation } from "@tanstack/react-query";
import { ai } from "@/lib/ai/client";
import { useActiveGoal } from "@/features/goals/useGoal";
import type { MealPlanResponse } from "@/lib/ai/contracts";

/** Genera un plan de comidas (día o semana) a partir del objetivo activo. */
export function useGeneratePlan() {
  const { data: goal } = useActiveGoal();
  return useMutation<MealPlanResponse, Error, { days: number }>({
    mutationFn: ({ days }) => {
      if (!goal) throw new Error("Configurá tu objetivo primero.");
      return ai.mealPlan({
        goalType: goal.type,
        targets: {
          calorie_target: goal.calorie_target,
          protein_g: goal.protein_g,
          carb_g: goal.carb_g,
          fat_g: goal.fat_g,
        },
        days,
      });
    },
  });
}
