import type { Currency, ExchangeRate, ForeignCurrency } from "./supabase/types";
import { convert } from "./money";

type Rate = Pick<ExchangeRate, "currency" | "buy" | "sell" | "valid_from"> & { source?: ExchangeRate["source"] };
/** 'buy' (compra) para dinero que entra; 'sell' (venta) para dinero que sale. */
export type Side = "buy" | "sell";

/**
 * ¿El historial tiene un TC confiable para esa fecha? No, si solo hay el valor
 * inicial genérico o si el último conocido es de más de 7 días antes.
 */
export function hasRateNear(dateISO: string, currency: ForeignCurrency, rates: Rate[]): boolean {
  const before = rates
    .filter((r) => r.currency === currency && r.valid_from <= dateISO && r.source !== "seed")
    .sort((a, b) => b.valid_from.localeCompare(a.valid_from))[0];
  if (!before) return false;
  const days = (Date.parse(dateISO) - Date.parse(before.valid_from)) / 86_400_000;
  return days <= 7;
}

/** Colones por unidad vigentes en una fecha: el último con valid_from <= fecha; si no hay, el más antiguo. */
export function rateFor(dateISO: string, currency: ForeignCurrency, rates: Rate[], side: Side): number {
  const all = rates.filter((r) => r.currency === currency);
  // El valor inicial genérico solo se usa si no hay ningún dato real.
  const real = all.filter((r) => r.source !== "seed");
  const mine = (real.length ? real : all).sort((a, b) => a.valid_from.localeCompare(b.valid_from));
  if (mine.length === 0) return 1;
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

/** Tipo de cambio de referencia del BCCR publicado por Hacienda (API pública, CORS abierto). */
export const BCCR_URL = "https://api.hacienda.go.cr/indicadores/tc";

export interface BccrRates {
  USD: { buy: number; sell: number; date: string };
  EUR: { buy: number; sell: number; date: string } | null;
}

/** Interpreta la respuesta de la API de Hacienda. El euro trae un solo valor en colones. */
export function parseBccr(json: unknown): BccrRates | null {
  const j = json as {
    dolar?: { compra?: { valor?: number; fecha?: string }; venta?: { valor?: number; fecha?: string } };
    euro?: { colones?: number; fecha?: string };
  };
  const buy = Number(j?.dolar?.compra?.valor);
  const sell = Number(j?.dolar?.venta?.valor);
  if (!(buy > 0) || !(sell > 0)) return null;
  const eur = Number(j?.euro?.colones);
  return {
    USD: { buy, sell, date: j.dolar!.venta!.fecha ?? j.dolar!.compra!.fecha ?? "" },
    EUR: eur > 0 ? { buy: eur, sell: eur, date: j.euro!.fecha ?? "" } : null,
  };
}

export async function fetchBccr(): Promise<BccrRates | null> {
  const res = await fetch(BCCR_URL);
  if (!res.ok) return null;
  return parseBccr(await res.json());
}
