/**
 * Saldos y deudas por jugador. Lógica PURA (testeable). La deuda se arrastra
 * entre fechas: cada partido no pagado suma, sin duplicar cargos.
 */
export interface BalanceRow {
  match_id: string;
  label: string; // "título · fecha" ya formateado por el llamador
  amount_due: number;
  amount_paid: number;
  payment_status: string;
}

export interface PlayerBalance {
  totalDue: number; // total que debió pagar (excluye invitados/no asistió)
  paid: number; // total abonado
  debt: number; // saldo pendiente
  unpaid: { label: string; amount: number }[]; // composición de la deuda
}

const NO_CHARGE = new Set(["exonerado", "no_asistio"]);

export function playerBalance(rows: BalanceRow[]): PlayerBalance {
  let totalDue = 0, paid = 0, debt = 0;
  const unpaid: { label: string; amount: number }[] = [];
  for (const r of rows) {
    if (NO_CHARGE.has(r.payment_status)) continue;
    totalDue += r.amount_due;
    paid += r.amount_paid;
    const owed = Math.max(0, r.amount_due - r.amount_paid);
    if (r.payment_status !== "confirmado" && owed > 0) {
      debt += owed;
      unpaid.push({ label: r.label, amount: owed });
    }
  }
  return { totalDue, paid, debt, unpaid };
}
