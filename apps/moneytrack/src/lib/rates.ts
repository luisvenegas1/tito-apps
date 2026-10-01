import type { Currency, ExchangeRate, ForeignCurrency } from "./supabase/types";
import { convert } from "./money";

type Rate = Pick<ExchangeRate, "currency" | "buy" | "sell" | "valid_from">;
/** 'buy' (compra) para dinero que entra; 'sell' (venta) para dinero que sale. */
export type Side = "buy" | "sell";

/** Colones por unidad vigentes en una fecha: el último con valid_from <= fecha; si no hay, el más antiguo. */
export function rateFor(dateISO: string, currency: ForeignCurrency, rates: Rate[], side: Side): number {
  const mine = rates.filter((r) => r.currency === currency).sort((a, b) => a.valid_from.localeCompare(b.valid_from));
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
