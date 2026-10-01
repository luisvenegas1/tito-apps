import type { Currency, ExchangeRate } from "./supabase/types";
import { convert } from "./money";

/** TC vigente para una fecha: el último con valid_from <= fecha; si no hay, el más antiguo. */
export function rateFor(dateISO: string, rates: Pick<ExchangeRate, "crc_per_usd" | "valid_from">[]): number {
  if (rates.length === 0) return 1;
  const sorted = [...rates].sort((a, b) => a.valid_from.localeCompare(b.valid_from));
  let chosen = sorted[0];
  for (const r of sorted) {
    if (r.valid_from <= dateISO) chosen = r;
    else break;
  }
  return Number(chosen.crc_per_usd);
}

/** Convierte un monto a la moneda base con el TC vigente en su fecha (la conversión es una vista). */
export function toBase(
  amount: number,
  currency: Currency,
  dateISO: string,
  base: Currency,
  rates: Pick<ExchangeRate, "crc_per_usd" | "valid_from">[],
): number {
  return convert(amount, currency, base, rateFor(dateISO, rates));
}
