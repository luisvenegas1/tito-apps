import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMode } from "@/features/mode/useMode";
import { todayISO } from "@/lib/date";
import type { CoachDayContext } from "@/lib/ai/contracts";
import type { PlanCategory } from "@/lib/supabase/types";
import { listPlanCategories, listExchangeEntries } from "./api";
import { computeDay } from "./proLogic";

const ZERO = { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 };

/** Construye el contexto del coach para el modo profesional (intercambios). */
export function buildProDayContext(cats: PlanCategory[], compliancePct: number, categories: {
  name: string;
  target: number;
  consumed: number;
  remaining: number;
  met: boolean;
}[]): CoachDayContext {
  return {
    mode: "professional",
    goalType: "professional_plan",
    calorieTarget: 0,
    consumed: ZERO,
    remaining: ZERO,
    hour: new Date().getHours(),
    plan: {
      compliancePct,
      categories: categories.map((c) => {
        const def = cats.find((x) => x.name === c.name);
        return {
          name: c.name,
          target: c.target,
          consumed: c.consumed,
          remaining: c.remaining,
          met: c.met,
          unit: def?.unit,
          gramsPerExchange: def?.grams_per_exchange ?? null,
        };
      }),
    },
  };
}

/**
 * Contexto del coach cuando el usuario está en modo profesional (o null si no).
 * Usa una lectura de solo lectura del plan (no siembra) para no crear categorías
 * a usuarios personales que abran el coach.
 */
export function useProCoachContext(): CoachDayContext | null {
  const { session } = useAuth();
  const { mode } = useMode();
  const userId = session?.user.id;
  const enabled = !!userId && mode === "professional";
  const date = todayISO();

  const plan = useQuery({
    queryKey: ["plan-categories", "peek"],
    queryFn: () => listPlanCategories(userId!),
    enabled,
  });
  const entries = useQuery({
    queryKey: ["exchange-entries", "peek", date],
    queryFn: () => listExchangeEntries(userId!, date),
    enabled,
  });

  if (!enabled) return null;
  const cats = plan.data ?? [];
  const compliance = computeDay(cats, entries.data ?? []);
  return buildProDayContext(cats, compliance.pct, compliance.categories);
}
