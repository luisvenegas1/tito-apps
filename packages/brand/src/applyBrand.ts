import type { AppBrand } from "./types";

/** Oscurece un color hex un porcentaje dado (para el estado hover). */
function darken(hex: string, amount = 0.12): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const num = parseInt(h, 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

/** Devuelve negro o blanco según cuál contraste mejor con el color dado. */
function contrastColor(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#ffffff";
  const num = parseInt(h, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  // Luminancia relativa aproximada.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111827" : "#ffffff";
}

/**
 * Inyecta los colores de un AppBrand como variables CSS en el documento.
 * Los demás tokens (surface, fg, border…) vienen de tokens.css.
 * Llamar una vez al iniciar la app.
 */
export function applyBrand(
  brand: AppBrand,
  target: HTMLElement = document.documentElement,
): void {
  const s = target.style;
  s.setProperty("--tt-primary", brand.primaryColor);
  s.setProperty("--tt-primary-hover", darken(brand.primaryColor));
  s.setProperty("--tt-primary-contrast", contrastColor(brand.primaryColor));
  s.setProperty("--tt-secondary", brand.secondaryColor);
}
