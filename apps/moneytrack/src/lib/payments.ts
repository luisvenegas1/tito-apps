import type { PaymentStatus } from "./supabase/types";
import { daysBetween } from "./dates";

export type PaymentState =
  | { kind: "paid" }
  | { kind: "skipped" }
  | { kind: "overdue"; days: number }
  | { kind: "today" }
  | { kind: "tomorrow" }
  | { kind: "upcoming"; days: number };

/** Estado visible de un pago programado ("atrasado" no se guarda: se calcula). */
export function paymentState(dueISO: string, status: PaymentStatus, todayISO: string): PaymentState {
  if (status === "paid") return { kind: "paid" };
  if (status === "skipped") return { kind: "skipped" };
  const d = daysBetween(todayISO, dueISO);
  if (d < 0) return { kind: "overdue", days: -d };
  if (d === 0) return { kind: "today" };
  if (d === 1) return { kind: "tomorrow" };
  return { kind: "upcoming", days: d };
}

export function paymentStateLabel(s: PaymentState): string {
  switch (s.kind) {
    case "paid": return "Pagado";
    case "skipped": return "Omitido";
    case "overdue": return s.days === 1 ? "Atrasado 1 día" : `Atrasado ${s.days} días`;
    case "today": return "Vence hoy";
    case "tomorrow": return "Vence mañana";
    case "upcoming": return `En ${s.days} días`;
  }
}

/** Grupo para la pantalla de próximos pagos. */
export function paymentGroup(s: PaymentState, daysToEndOfWeek: number): "overdue" | "week" | "later" | "done" {
  if (s.kind === "paid" || s.kind === "skipped") return "done";
  if (s.kind === "overdue") return "overdue";
  if (s.kind === "today" || s.kind === "tomorrow") return "week";
  return s.days <= daysToEndOfWeek ? "week" : "later";
}
