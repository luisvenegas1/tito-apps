import type { Currency, ExchangeRate, Transaction } from "./supabase/types";
import type { ByCurrency } from "./money";
import { toBase } from "./rates";

type Txn = Pick<Transaction, "kind" | "amount" | "currency" | "occurred_on" | "category_id" | "paid_by" | "scope" | "my_share"> &
  Partial<Pick<Transaction, "shared_entry_id">>;
type Rate = Pick<ExchangeRate, "currency" | "buy" | "sell" | "valid_from">;

/** Parte del gasto que sale de MI bolsillo (doc 06 §6.5). */
export function myPortion(t: Pick<Txn, "amount" | "paid_by" | "my_share">): number {
  if (t.paid_by === "me") return Number(t.amount);
  if (t.paid_by === "shared") return Number(t.amount) * Number(t.my_share ?? 0.5);
  return 0; // lo paga la pareja u otra persona: sigue existiendo, pero no sale de mi bolsillo
}

export interface MonthSummary {
  /** Todos los montos en moneda base. */
  income: number;
  /** Gastos personales: scope personal y pagados por mí o compartidos (mi parte). */
  personal: number;
  /** Gastos del hogar: todo lo del hogar, sin importar quién paga (costo real). */
  household: number;
  /** Todo lo que salió de mi bolsillo (gastos + adelantos). */
  myOutflow: number;
  /** Reembolsos recibidos por adelantos. */
  reimbursed: number;
  /** Lo que pagaste con tu dinero por otra persona y quedó en su cuenta compartida (te lo deben: no es gasto). */
  paidForOthers: number;
  /** ingresos + reembolsos − lo que salió de mi bolsillo (negativo = déficit). */
  available: number;
  byCategory: { category_id: string | null; total: number }[];
  /** Gastos de mi bolsillo por moneda original, sin convertir. */
  outflowByCurrency: ByCurrency;
  incomeByCurrency: ByCurrency;
}

export function monthSummary(txns: Txn[], rates: Rate[], base: Currency): MonthSummary {
  let income = 0, personal = 0, household = 0, myOutflow = 0, reimbursed = 0, paidForOthers = 0;
  const cats = new Map<string | null, number>();
  const outflowByCurrency: ByCurrency = {};
  const incomeByCurrency: ByCurrency = {};

  for (const t of txns) {
    const amt = Number(t.amount);
    // Lo que entra se convierte a compra; lo que sale, a venta.
    const bIn = (v: number) => toBase(v, t.currency, t.occurred_on, base, rates, "buy");
    const b = (v: number) => toBase(v, t.currency, t.occurred_on, base, rates, "sell");
    switch (t.kind) {
      case "income":
        income += bIn(amt);
        incomeByCurrency[t.currency] = (incomeByCurrency[t.currency] ?? 0) + amt;
        break;
      case "reimbursement":
        reimbursed += bIn(amt);
        break;
      case "advance": {
        if (t.shared_entry_id) {
          // Cargo pagado por mí en una cuenta compartida: es una cuenta por cobrar, no un gasto.
          paidForOthers += b(amt);
          break;
        }
        const mine = myPortion(t);
        myOutflow += b(mine);
        outflowByCurrency[t.currency] = (outflowByCurrency[t.currency] ?? 0) + mine;
        break;
      }
      case "expense": {
        const mine = myPortion(t);
        myOutflow += b(mine);
        if (mine > 0) outflowByCurrency[t.currency] = (outflowByCurrency[t.currency] ?? 0) + mine;
        if (t.scope === "household") household += b(amt);
        else personal += b(mine); // personal y 'shared': cuenta mi parte
        // Por categoría: costo real del hogar, o mi parte en lo personal/compartido.
        const catValue = t.scope === "household" ? b(amt) : b(mine);
        cats.set(t.category_id, (cats.get(t.category_id) ?? 0) + catValue);
        break;
      }
    }
  }

  const byCategory = [...cats.entries()]
    .map(([category_id, total]) => ({ category_id, total }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  return {
    income,
    personal,
    household,
    myOutflow,
    reimbursed,
    paidForOthers,
    available: income + reimbursed - myOutflow,
    byCategory,
    outflowByCurrency,
    incomeByCurrency,
  };
}

/** Variación porcentual (null si no hay base de comparación). */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
