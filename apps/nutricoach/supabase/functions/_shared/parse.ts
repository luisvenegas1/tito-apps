// Utilidades compartidas para los adapters de proveedor de IA.

/** Extrae el primer objeto JSON de un texto (tolera fences ```json y prosa alrededor). */
export function extractJson<T = unknown>(text: string): T {
  const cleaned = text.replace(/```json/gi, "```").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("La IA no devolvió JSON.");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

/** Separa una data URL base64 en { mediaType, data }. */
export function parseDataUrl(dataUrl: string): { mediaType: string; data: string } {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (m) return { mediaType: m[1], data: m[2] };
  // Si ya viene solo el base64, asumimos JPEG.
  return { mediaType: "image/jpeg", data: dataUrl };
}

/** Coacciona a número seguro (>= 0), o 0. */
export function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
