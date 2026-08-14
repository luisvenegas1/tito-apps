import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDashboard } from "@/features/dashboard/useDashboard";
import type { CoachDayContext } from "@/lib/ai/contracts";
import type { Macros } from "@titoapps/nutrition";
import { listCoachMessages, sendToCoach, getProactiveTip } from "./api";
import type { DashboardData } from "@/features/dashboard/useDashboard";
import { useProCoachContext } from "@/features/pro/proCoach";

const ZERO: Macros = { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 };

/** Construye el contexto del día para el coach a partir del dashboard. */
export function buildDayContext(d: DashboardData | undefined): CoachDayContext {
  return {
    goalType: d?.goalType ?? "maintain",
    calorieTarget: d?.targets?.calorie_target ?? 0,
    consumed: d?.consumed ?? ZERO,
    remaining: (d?.remaining as unknown as Macros) ?? ZERO,
    weightKg: d?.weightKg ?? undefined,
    targetWeightKg: d?.targetWeightKg ?? undefined,
    kcalBurned: d?.kcalBurned ?? undefined,
    hour: new Date().getHours(),
  };
}

export function useCoachMessages() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: qk.coach,
    queryFn: () => listCoachMessages(userId!),
    enabled: !!userId,
  });
}

export function useSendCoach() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  const { data: dashboard } = useDashboard();
  const { data: history = [] } = useCoachMessages();
  const proContext = useProCoachContext();

  return useMutation({
    mutationFn: (message: string) =>
      sendToCoach(userId!, history, message, proContext ?? buildDayContext(dashboard)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.coach }),
  });
}

export function useProactiveTip() {
  const { data: dashboard } = useDashboard();
  const proContext = useProCoachContext();
  const context = proContext ?? buildDayContext(dashboard);
  const enabled = proContext ? (proContext.plan?.categories.length ?? 0) > 0 : !!dashboard?.targets;
  const cacheKey = proContext
    ? proContext.plan?.categories.reduce((s, c) => s + c.consumed, 0) ?? 0
    : dashboard?.consumed.kcal ?? 0;
  return useQuery({
    queryKey: ["coach", "tip", proContext ? "pro" : "personal", cacheKey],
    queryFn: () => getProactiveTip(context),
    enabled,
    staleTime: 5 * 60_000,
  });
}
