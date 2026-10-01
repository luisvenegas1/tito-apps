// Sin dependencias de Deno: lo usa la Edge Function y lo prueba Vitest.

/** API pública de Hacienda con el tipo de cambio de referencia del BCCR. */
export const BCCR_URL = "https://api.hacienda.go.cr/indicadores/tc";

export interface ReferenceRow {
  currency: "USD" | "EUR";
  rate_date: string; // YYYY-MM-DD
  buy: number;
  sell: number;
}

/** Interpreta la respuesta de Hacienda. El euro trae un solo valor en colones (compra = venta). */
export function parseHacienda(json: unknown, fallbackDate: string): ReferenceRow[] {
  const j = json as {
    dolar?: { compra?: { valor?: number; fecha?: string }; venta?: { valor?: number; fecha?: string } };
    euro?: { colones?: number; fecha?: string };
  };
  const rows: ReferenceRow[] = [];
  const buy = Number(j?.dolar?.compra?.valor);
  const sell = Number(j?.dolar?.venta?.valor);
  if (buy > 0 && sell > 0) {
    rows.push({ currency: "USD", rate_date: j.dolar?.venta?.fecha ?? j.dolar?.compra?.fecha ?? fallbackDate, buy, sell });
  }
  const eur = Number(j?.euro?.colones);
  if (eur > 0) rows.push({ currency: "EUR", rate_date: j.euro?.fecha ?? fallbackDate, buy: eur, sell: eur });
  return rows;
}

/** Fecha de hoy en Costa Rica (el día del BCCR), sin depender de la zona del servidor. */
export function todayInCostaRica(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica" }).format(now);
}
