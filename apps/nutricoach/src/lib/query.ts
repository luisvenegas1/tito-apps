import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 30_000 } },
});

/** Query keys centralizadas. Ver docs/api.md. */
export const qk = {
  session: ["session"] as const,
  profile: ["profile"] as const,
  goal: ["goal", "active"] as const,
  log: (date: string) => ["log", date] as const,
  dashboard: (date: string) => ["dashboard", date] as const,
  foods: (q: string) => ["foods", q] as const,
  weights: ["weights"] as const,
  water: (date: string) => ["water", date] as const,
  workouts: (date: string) => ["workouts", date] as const,
  coach: ["coach"] as const,
} as const;
