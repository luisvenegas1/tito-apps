import type { MatchPlayer, PaymentStatus } from "@/lib/supabase/types";

/**
 * Lógica PURA de transición de estado de pago (sin Supabase), para testearla.
 * Devuelve qué debe cambiar; el timestamp `confirmed_at` lo aplica la capa de datos.
 */
export interface PaymentPatch {
  payment_status: PaymentStatus;
  /** true si el pago quedó confirmado (la API pondrá confirmed_at = now). */
  confirmed: boolean;
  /** Nuevo monto pagado, si corresponde. */
  amount_paid?: number;
}

export function paymentPatch(
  player: Pick<MatchPlayer, "amount_due">,
  status: PaymentStatus,
  amountPaid?: number,
): PaymentPatch {
  const patch: PaymentPatch = {
    payment_status: status,
    confirmed: status === "confirmado",
  };
  if (amountPaid !== undefined) patch.amount_paid = amountPaid;
  if (status === "confirmado") patch.amount_paid = player.amount_due; // aprobar = pagó todo
  if (status === "pendiente") patch.amount_paid = 0; // rechazar/revertir = vuelve a 0
  return patch;
}
