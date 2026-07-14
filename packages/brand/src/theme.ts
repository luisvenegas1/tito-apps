/** Modo de tema. El dark mode intercambia SOLO la capa de tokens semánticos. */
export type BrandTheme = "light" | "dark";

/** Aplica el tema en el elemento raíz (por defecto <html>). */
export function setTheme(
  theme: BrandTheme,
  target: HTMLElement = document.documentElement,
): void {
  target.setAttribute("data-theme", theme);
}

/** Lee el tema actual. */
export function getTheme(target: HTMLElement = document.documentElement): BrandTheme {
  return target.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** Alterna entre claro y oscuro. */
export function toggleTheme(target: HTMLElement = document.documentElement): BrandTheme {
  const next: BrandTheme = getTheme(target) === "dark" ? "light" : "dark";
  setTheme(next, target);
  return next;
}
