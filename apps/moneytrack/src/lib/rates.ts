import type { Currency, ExchangeRate, ForeignCurrency } from "./supabase/types";
import { convert } from "./money";

type Rate = Pick<ExchangeRate, "currency" | "buy" | "sell" | "valid_from"> & { source?: ExchangeRate["source"] };
/** 'buy' (compra) para dinero que entra; 'sell' (venta) para dinero que sale. */
export type Side = "buy" | "sell";

/** ¿Hay un TC confiable para esa fecha? No, si no hay ninguno anterior o el último es de más de 7 días antes. */
export function hasRateNear(dateISO: string, currency: ForeignCurrency, rates: Rate[]): boolean {
  const before = rates
    .filter((r) => r.currency === currency && r.valid_from <= dateISO)
    .sort((a, b) => b.valid_from.localeCompare(a.valid_from))[0];
  if (!before) return false;
  const days = (Date.parse(dateISO) - Date.parse(before.valid_from)) / 86_400_000;
  return days <= 7;
}

/** Solo si todavía no hay ningún tipo de cambio guardado (primer arranque sin red). */
const FALLBACK: Record<ForeignCurrency, Record<Side, number>> = {
  USD: { buy: 455, sell: 460 },
  EUR: { buy: 520, sell: 520 },
};

/** Colones por unidad vigentes en una fecha: el último con valid_from <= fecha; si no hay, el más antiguo. */
export function rateFor(dateISO: string, currency: ForeignCurrency, rates: Rate[], side: Side): number {
  // En empate de fecha gana el manual (el de tu banco).
  const mine = rates
    .filter((r) => r.currency === currency)
    .sort((a, b) => a.valid_from.localeCompare(b.valid_from) || (a.source === "manual" ? 1 : 0) - (b.source === "manual" ? 1 : 0));
  if (mine.length === 0) return FALLBACK[currency][side];
  let chosen = mine[0];
  for (const r of mine) {
    if (r.valid_from <= dateISO) chosen = r;
    else break;
  }
  return Number(chosen[side]);
}

/** Convierte un monto a la moneda base con el TC vigente en su fecha (la conversión es una vista). */
export function toBase(amount: number, currency: Currency, dateISO: string, base: Currency, rates: Rate[], side: Side = "sell"): number {
  return convert(amount, currency, base, (c) => (c === "CRC" ? 1 : rateFor(dateISO, c, rates, side)));
}

/**
 * Convierte un movimiento a la moneda base usando SU tipo de cambio congelado
 * (el del día en que ocurrió). Si no lo tiene, se busca en el historial a su fecha.
 */
export function txToBase(
  amount: number,
  t: { currency: Currency; occurred_on: string; fx_rate?: number | null },
  base: Currency,
  rates: Rate[],
  side: Side = "sell",
): number {
  if (t.currency === base) return amount;
  if (!t.fx_rate || t.currency === "CRC") return toBase(amount, t.currency, t.occurred_on, base, rates, side);
  const crc = amount * Number(t.fx_rate);
  return base === "CRC" ? crc : crc / rateFor(t.occurred_on, base, rates, side);
}
