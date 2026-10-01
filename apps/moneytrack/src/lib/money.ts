import type { Currency } from "./supabase/types";

export const CURRENCIES: Currency[] = ["CRC", "USD", "EUR"];
export const CURRENCY_SYMBOL: Record<Currency, string> = { CRC: "₡", USD: "$", EUR: "€" };
export const CURRENCY_NAME: Record<Currency, string> = { CRC: "Colones", USD: "Dólares", EUR: "Euros" };
/** Opciones para el selector de moneda (₡ $ €). */
export const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: CURRENCY_SYMBOL[c] }));

/** "₡185.000" / "$42,50" / "€10,00". Los colones sin decimales salvo que existan céntimos. */
export function formatMoney(amount: number, currency: Currency, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(amount);
  const hasCents = Math.round(abs * 100) % 100 !== 0;
  const digits = currency !== "CRC" || hasCents ? 2 : 0;
  // Formato fijo (punto de miles, coma decimal) en vez de Intl: el ICU de cada
  // navegador usa espacio fino para es-CR y el resultado variaría entre equipos.
  const [int, dec] = abs.toFixed(digits).split(".");
  const num = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (dec ? `,${dec}` : "");
  const sign = amount < 0 ? "−" : opts.sign && amount > 0 ? "+" : "";
  return `${sign}${CURRENCY_SYMBOL[currency]}${num}`;
}

/**
 * Interpreta lo que el usuario escribe: "15000", "15.000", "15,000", "42,5", "42.50".
 * Regla: el último separador seguido de 1-2 dígitos es decimal; los demás son miles.
 */
export function parseAmount(input: string): number | null {
  const s = input.replace(/[₡$€\s]/g, "");
  if (!s || !/^[\d.,]+$/.test(s)) return null;
  const m = s.match(/[.,](\d{1,2})$/);
  let normalized: string;
  if (m) {
    const intPart = s.slice(0, s.length - m[0].length).replace(/[.,]/g, "");
    normalized = `${intPart || "0"}.${m[1]}`;
  } else {
    normalized = s.replace(/[.,]/g, "");
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/**
 * Convierte pasando por colones. `crcPer` da los colones por unidad de cada
 * moneda extranjera (ya elegido compra o venta según el caso).
 */
export function convert(amount: number, from: Currency, to: Currency, crcPer: (c: Currency) => number): number {
  if (from === to) return amount;
  const crc = from === "CRC" ? amount : amount * crcPer(from);
  return to === "CRC" ? crc : crc / crcPer(to);
}

/** Suma por moneda sin convertir: { CRC: 1000, USD: 5 } */
export type ByCurrency = Partial<Record<Currency, number>>;

export function formatByCurrency(v: ByCurrency): string {
  const parts = CURRENCIES.filter((c) => v[c] !== undefined && Math.abs(v[c]!) >= 0.005).map((c) => formatMoney(v[c]!, c));
  return parts.length ? parts.join(" · ") : formatMoney(0, "CRC");
}
