/**
 * Convierte una lista de objetos a CSV. Puro y testeable.
 * - Deriva las columnas de `columns` o de las claves del primer objeto.
 * - Escapa comillas, comas y saltos de línea según RFC 4180.
 */
export function toCsv<T extends object>(rows: T[], columns?: (keyof T)[]): string {
  if (rows.length === 0) return "";
  const cols = columns ?? (Object.keys(rows[0]) as (keyof T)[]);
  const escape = (v: unknown): string => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.map((c) => escape(String(c))).join(",");
  const body = rows
    .map((row) => cols.map((c) => escape((row as Record<string, unknown>)[c as string])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

/** Dispara la descarga de un archivo de texto en el navegador. */
export function downloadFile(filename: string, content: string, mime = "text/plain"): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
