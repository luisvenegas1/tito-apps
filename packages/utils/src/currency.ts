export interface CurrencyOptions {
  /** Locale BCP 47, ej. "es-CR", "en-US". Por defecto "es-CR". */
  locale?: string;
  /** Código ISO 4217, ej. "USD", "CRC". Si se define, usa formato de moneda de Intl. */
  currency?: string;
  /** Símbolo manual, ej. "₡", "$". Se usa cuando no se pasa `currency`. */
  symbol?: string;
}

/**
 * Formatea un monto de dinero de forma neutral y configurable.
 *
 *  formatCurrency(2200, { locale: "es-CR", symbol: "₡" })      -> "₡2.200"
 *  formatCurrency(1500, { locale: "en-US", currency: "USD" })  -> "$1,500.00"
 *
 * No asume ninguna moneda por defecto: el llamador decide símbolo o código.
 */
export function formatCurrency(amount: number, options: CurrencyOptions = {}): string {
  const { locale = "es-CR", currency, symbol } = options;

  if (currency) {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  }

  const num = Math.round(amount).toLocaleString(locale);
  return symbol ? `${symbol}${num}` : num;
}
