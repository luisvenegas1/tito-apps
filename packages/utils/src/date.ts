/**
 * Formatea una fecha ISO (YYYY-MM-DD) a texto legible.
 * Locale y opciones configurables; por defecto es-CR con día/mes/semana.
 *
 *  formatDate("2026-07-13") -> "lunes, 13 de julio"
 */
export function formatDate(
  iso: string,
  locale = "es-CR",
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  },
): string {
  const date = new Date(iso + "T00:00:00");
  // Fecha inválida -> devolvemos el string original (mejora respecto del
  // comportamiento previo que devolvía "Invalid Date"). GolPay siempre pasa
  // fechas ISO válidas, así que su salida no cambia.
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return date.toLocaleDateString(locale, options);
  } catch {
    return iso;
  }
}
