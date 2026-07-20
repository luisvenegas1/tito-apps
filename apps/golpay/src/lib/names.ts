/**
 * Normaliza cómo se escriben los nombres: primera letra de cada palabra en
 * mayúscula. Pensado para español (partículas en minúscula) y para los nombres
 * cortos que se usan en las listas de WhatsApp.
 */

/** Partículas que van en minúscula cuando NO son la primera palabra. */
const PARTICLES = new Set(["de", "del", "la", "las", "los", "y", "e", "da", "das", "do", "dos", "van", "von", "di", "el"]);

/** Prefijos que llevan mayúscula interna: "mcdonald" -> "McDonald". */
const PREFIXES: Array<[RegExp, (m: string, rest: string) => string]> = [
  [/^mc(.+)$/i, (_m, rest) => "Mc" + upperFirst(rest)],
  [/^o'(.+)$/i, (_m, rest) => "O'" + upperFirst(rest)],
];

function upperFirst(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function word(w: string, isFirst: boolean): string {
  if (!w) return w;
  const lower = w.toLowerCase();

  // Partículas en minúscula salvo al inicio: "juan de la cruz" -> "Juan de la Cruz".
  if (!isFirst && PARTICLES.has(lower)) return lower;

  for (const [re, fn] of PREFIXES) {
    const m = lower.match(re);
    if (m) return fn(m[0], m[1]);
  }

  // Compuestos con guion o apóstrofo: "jean-luc" -> "Jean-Luc".
  if (/[-']/.test(lower)) {
    return lower
      .split(/([-'])/)
      .map((part) => (part === "-" || part === "'" ? part : upperFirst(part)))
      .join("");
  }

  return upperFirst(lower);
}

/**
 * "gabrio" -> "Gabrio" · "sebas castro" -> "Sebas Castro" · "sebas c" -> "Sebas C"
 * "JUAN DE LA CRUZ" -> "Juan de la Cruz"
 * Colapsa espacios repetidos y recorta los extremos.
 */
export function titleCaseName(input: string): string {
  const clean = input.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.split(" ").map((w, i) => word(w, i === 0)).join(" ");
}
