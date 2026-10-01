import type { Currency, SharedEntry } from "./supabase/types";
import type { ByCurrency } from "./money";

type Entry = Pick<SharedEntry, "id" | "type" | "amount" | "currency" | "occurred_on" | "created_at" | "deleted_at">;

export interface LedgerRow<E extends Entry = Entry> {
  entry: E;
  /** Saldo corriente en la moneda de la fila, después de aplicarla. */
  running: number;
}

/** Orden cronológico estable: fecha y luego momento de registro. */
function chronological(a: Entry, b: Entry): number {
  return a.occurred_on.localeCompare(b.occurred_on) || a.created_at.localeCompare(b.created_at);
}

/** Saldo por moneda (cargos − abonos), ignorando eliminados. Positivo = la deudora debe. */
export function balances(entries: Entry[]): ByCurrency {
  const out: ByCurrency = {};
  for (const e of entries) {
    if (e.deleted_at) continue;
    const sign = e.type === "charge" ? 1 : -1;
    out[e.currency] = round2((out[e.currency] ?? 0) + sign * Number(e.amount));
  }
  return out;
}

/**
 * Filas del libro con saldo corriente por moneda, en orden cronológico.
 * Los eliminados aparecen (para el historial) pero no mueven el saldo.
 */
export function ledgerRows<E extends Entry>(entries: E[]): LedgerRow<E>[] {
  const running: Record<Currency, number> = { CRC: 0, USD: 0, EUR: 0 };
  return [...entries].sort(chronological).map((entry) => {
    if (!entry.deleted_at) {
      running[entry.currency] = round2(running[entry.currency] + (entry.type === "charge" ? 1 : -1) * Number(entry.amount));
    }
    return { entry, running: running[entry.currency] };
  });
}

/** Totales de un período: cuánto se cargó y cuánto se abonó (recuperado), por moneda. */
export function periodTotals(entries: Entry[], from: string, to: string): { charged: ByCurrency; paid: ByCurrency } {
  const charged: ByCurrency = {};
  const paid: ByCurrency = {};
  for (const e of entries) {
    if (e.deleted_at || e.occurred_on < from || e.occurred_on > to) continue;
    const bucket = e.type === "charge" ? charged : paid;
    bucket[e.currency] = round2((bucket[e.currency] ?? 0) + Number(e.amount));
  }
  return { charged, paid };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
