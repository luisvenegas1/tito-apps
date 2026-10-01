/** Recurrentes, próximos pagos, metas y notificaciones. */
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireUserId, supabase } from "@/lib/supabase/client";
import { check } from "@/lib/errors";
import { qk } from "@/lib/query";
import { addMonths, currentMonth, monthRange } from "@/lib/dates";
import type { AppNotification, Goal, RecurringTemplate, ScheduledPayment } from "@/lib/supabase/types";

export function useTemplates() {
  return useQuery({
    queryKey: qk.templates,
    queryFn: async () =>
      (check(await supabase.from("recurring_templates").select("*").order("name")) as RecurringTemplate[]).map((t) => ({
        ...t,
        amount_est: t.amount_est === null ? null : Number(t.amount_est),
      })),
  });
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Omit<RecurringTemplate, "id" | "user_id"> & { id?: string }) => {
      const { id, ...fields } = t;
      if (id) check(await supabase.from("recurring_templates").update(fields).eq("id", id));
      else {
        const uid = await requireUserId();
        check(await supabase.from("recurring_templates").insert({ ...fields, user_id: uid }));
      }
      // Genera de inmediato las instancias para que aparezcan en próximos pagos.
      check(await supabase.rpc("generate_scheduled_payments", {}));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.templates });
      qc.invalidateQueries({ queryKey: qk.payments });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => check(await supabase.from("recurring_templates").delete().eq("id", id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.templates });
      qc.invalidateQueries({ queryKey: qk.payments });
    },
  });
}

/** Pagos programados desde el mes pasado hasta dentro de ~45 días. */
export function useScheduledPayments() {
  return useQuery({
    queryKey: qk.payments,
    queryFn: async () =>
      (
        check(
          await supabase
            .from("scheduled_payments")
            .select("*")
            .gte("due_date", monthRange(addMonths(currentMonth(), -1)).from)
            .order("due_date"),
        ) as ScheduledPayment[]
      ).map((p) => ({ ...p, amount_est: p.amount_est === null ? null : Number(p.amount_est) })),
  });
}

/**
 * Genera las instancias del período al abrir la app (respaldo del pg_cron:
 * si el cron no corrió, el usuario igual ve sus pagos). Idempotente.
 */
export function useEnsureScheduledPayments(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    supabase.rpc("generate_scheduled_payments", {}).then(({ data }) => {
      if (data) qc.invalidateQueries({ queryKey: qk.payments });
    });
  }, [enabled, qc]);
}

export function usePayScheduled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { id: string; amount: number; date: string }) =>
      check(await supabase.rpc("pay_scheduled_payment", { p_id: a.id, p_amount: a.amount, p_date: a.date })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.payments });
      qc.invalidateQueries({ queryKey: qk.tx });
    },
  });
}

export function useUpdateScheduled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Pick<ScheduledPayment, "status" | "due_date" | "amount_est">>) =>
      check(await supabase.from("scheduled_payments").update(patch).eq("id", id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.payments }),
  });
}

export function useGoals() {
  return useQuery({
    queryKey: qk.goals,
    queryFn: async () =>
      (check(await supabase.from("goals").select("*").order("created_at")) as Goal[]).map((g) => ({
        ...g,
        target_amount: Number(g.target_amount),
        saved_amount: Number(g.saved_amount),
      })),
  });
}

export function useSaveGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (g: Partial<Goal> & { id?: string }) => {
      const { id, ...fields } = g;
      if (id) check(await supabase.from("goals").update(fields).eq("id", id));
      else {
        const uid = await requireUserId();
        check(await supabase.from("goals").insert({ ...fields, user_id: uid }));
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.goals }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => check(await supabase.from("goals").delete().eq("id", id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.goals }),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: qk.notifications,
    queryFn: async () =>
      check(await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50)) as AppNotification[],
    refetchInterval: 5 * 60_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      check(await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });
}
