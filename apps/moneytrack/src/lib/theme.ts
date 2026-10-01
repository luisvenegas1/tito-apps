import { setTheme, type BrandTheme } from "@titoapps/brand";

/** Preferencia del usuario: un tema fijo o seguir al sistema. */
export type ThemePref = BrandTheme | "auto";

const KEY = "mt.theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "auto";
  } catch {
    return "auto";
  }
}

function apply(pref: ThemePref): void {
  setTheme(pref === "auto" ? (media().matches ? "dark" : "light") : pref);
}

export function setThemePref(pref: ThemePref): void {
  try {
    if (pref === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* sin almacenamiento: dura hasta recargar */
  }
  apply(pref);
}

/** Al iniciar: aplica la preferencia y, en automático, sigue los cambios del sistema. */
export function initTheme(): void {
  apply(getThemePref());
  media().addEventListener("change", () => {
    if (getThemePref() === "auto") apply("auto");
  });
}
