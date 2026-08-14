import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query";
import { useAuth } from "@/features/auth/AuthProvider";
import { todayISO } from "@/lib/date";
import {
  getOrSeedPlan,
  createCategory,
  updateCategory,
  deleteCategory,
  listExchangeEntries,
  listExchangeEntriesRange,
  addExchangeEntries,
  updateExchangeEntry,
  deleteExchangeEntry,
  listUserBadges,
  grantBadges,
  type NewCategory,
  type CategoryPatch,
  type NewExchangeEntry,
  type ExchangeEntryPatch,
} from "./api";
import {
  computeDay,
  computeRange,
  buildBadgeStats,
  evaluateBadges,
  lastDates,
  type RangeDay,
} from "./proLogic";

// ---------- Plan ----------
export function usePlanCategories() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: qk.planCategories,
    queryFn: () => getOrSeedPlan(userId!),
    enabled: !!userId,
  });
}

function useInvalidatePro() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.planCategories });
    qc.invalidateQueries({ queryKey: ["pro-day"] });
    qc.invalidateQueries({ queryKey: ["pro-range"] });
  };
}

export function useCreateCategory() {
  const { session } = useAuth();
  const invalidate = useInvalidatePro();
  return useMutation({
    mutationFn: (c: NewCategory) => createCategory(session!.user.id, c),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidatePro();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CategoryPatch }) => updateCategory(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidatePro();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: invalidate,
  });
}

// ---------- Día (progreso + entradas) ----------
export function useProDay(date = todayISO()) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const plan = usePlanCategories();

  const entries = useQuery({
    queryKey: qk.proDay(date),
    queryFn: () => listExchangeEntries(userId!, date),
    enabled: !!userId,
  });

  const categories = plan.data ?? [];
  const entryList = entries.data ?? [];
  const compliance = computeDay(categories, entryList);

  return {
    isLoading: plan.isLoading || entries.isLoading,
    categories,
    entries: entryList,
    compliance,
  };
}

function useInvalidateDay(date: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.proDay(date) });
    qc.invalidateQueries({ queryKey: ["pro-range"] });
  };
}

export function useAddExchanges(date = todayISO()) {
  const { session } = useAuth();
  const invalidate = useInvalidateDay(date);
  return useMutation({
    mutationFn: (entries: NewExchangeEntry[]) => addExchangeEntries(session!.user.id, date, entries),
    onSuccess: invalidate,
  });
}

export function useUpdateExchange(date = todayISO()) {
  const invalidate = useInvalidateDay(date);
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ExchangeEntryPatch }) => updateExchangeEntry(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteExchange(date = todayISO()) {
  const invalidate = useInvalidateDay(date);
  return useMutation({
    mutationFn: (id: string) => deleteExchangeEntry(id),
    onSuccess: invalidate,
  });
}

// ---------- Rango (historial / estadísticas) ----------
export function useProRange(days = 30) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const plan = usePlanCategories();

  const entries = useQuery({
    queryKey: qk.proRange(days),
    queryFn: () => {
      const dates = lastDates(days);
      return listExchangeEntriesRange(userId!, dates[0], dates[dates.length - 1]);
    },
    enabled: !!userId,
  });

  const categories = plan.data ?? [];
  const range: RangeDay[] = computeRange(categories, entries.data ?? [], days);

  return {
    isLoading: plan.isLoading || entries.isLoading,
    categories,
    range,
  };
}

// ---------- Badges (sincronización automática) ----------
export function useBadges() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: qk.badges,
    queryFn: () => listUserBadges(userId!),
    enabled: !!userId,
  });
}

/**
 * Evalúa los badges ganados a partir de las estadísticas y los persiste (una vez).
 * Se llama desde el dashboard/estadísticas del modo profesional.
 */
export function useSyncBadges() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  const { range, isLoading } = useProRange(30);
  const { data: earned } = useBadges();

  useEffect(() => {
    if (isLoading || !userId || !earned) return;
    const target = evaluateBadges(buildBadgeStats(range));
    const have = new Set(earned.map((b) => b.badge_id));
    const missing = target.filter((id) => !have.has(id));
    if (missing.length > 0) {
      grantBadges(userId, missing).then(() => qc.invalidateQueries({ queryKey: qk.badges }));
    }
  }, [isLoading, userId, earned, range, qc]);
}

export { grantBadges };
