import { stripInvisible } from "@/lib/names";
/**
 * Parser de listas de WhatsApp -> jugadores.
 *
 * Objetivos:
 *  - Detectar nombres de una lista pegada desde WhatsApp.
 *  - Ignorar numeración (1., 2), 3-, etc.), emojis, títulos y líneas vacías.
 *  - Detectar líneas que contienen dos jugadores (Diego + Marco, Luis y Juan).
 *  - Deduplicar nombres (case-insensitive).
 *
 * NO decide fusiones con jugadores frecuentes: eso se confirma en la UI.
 */

export interface ParsedPlayer {
  /** Nombre limpio y normalizado para mostrar. */
  name: string;
  /** Texto original de la línea (para referencia/edición). */
  raw: string;
  /** true si la línea parecía contener más de un jugador. */
  splittable: boolean;
  /** Sugerencia de nombres si es divisible. */
  suggestions?: string[];
  /** true si la línea marcaba al jugador como portero (🧤 o "portero"). */
  goalkeeper: boolean;
}

/** Detecta si la línea marca a un portero: guante 🧤 o palabra clave. */
function detectGoalkeeper(rawLine: string, cleanText: string): boolean {
  // 🧤 = U+1F9E4. También aceptamos variantes de "guante/portero/arquero".
  if (/\u{1F9E4}/u.test(rawLine)) return true;
  if (/\b(portero|arquero|golero|guante|arco)\b/i.test(cleanText)) return true;
  return false;
}

// Palabras que, si son TODA la línea, se consideran títulos y se ignoran.
const TITLE_WORDS = [
  "mejenga",
  "lunes",
  "martes",
  "miercoles",
  "miércoles",
  "jueves",
  "viernes",
  "sabado",
  "sábado",
  "domingo",
  "torneo",
  "cuadrangular",
  "partido",
  "cancha",
  "lista",
  "confirmados",
  "titulares",
  "suplentes",
  "porteros",
];

const SEPARATORS = /\s+(?:\+|&|y|con)\s+|\s*\/\s*|\s*,\s*/i;

/** Quita emojis y símbolos decorativos comunes. */
function stripEmojis(input: string): string {
  return input
    // Rango amplio de emojis y pictogramas.
    .replace(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu,
      " ",
    )
    .replace(/[✅✔️❌⚽🥅🔥👍🏻🏼🏽🏾🏿]/gu, " ");
}

/** Quita numeración inicial: "1.", "2)", "3 -", "4)", "- ", "• ", "*". */
function stripLeadingMarkers(input: string): string {
  return input
    .replace(/^\s*[-•*·]+\s*/, "")
    .replace(/^\s*\d+\s*[.)\-–:]?\s*/, "")
    .trim();
}

/** ¿La línea es solo un título / encabezado? */
function isTitleLine(clean: string): boolean {
  const lower = clean.toLowerCase();
  // Contiene hora (8 pm, 20:00) -> encabezado.
  if (/\b\d{1,2}\s*(:\d{2})?\s*(am|pm|hrs|h)\b/i.test(lower)) return true;
  if (/\b\d{1,2}:\d{2}\b/.test(lower)) return true;
  // Todas las palabras son "de título".
  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const allTitle = words.every(
    (w) => TITLE_WORDS.includes(w) || /^\d+$/.test(w),
  );
  return allTitle;
}

// Conectores que van en minúscula dentro de un nombre (ej. "Compa de Gabrio").
const CONNECTORS = new Set(["de", "del", "la", "las", "los", "y", "e"]);

/** Normaliza espacios y capitaliza cada palabra (respeta iniciales tipo "C"). */
function tidyName(input: string): string {
  const cleaned = input.replace(/\s+/g, " ").trim();
  return cleaned
    .split(" ")
    .map((w, i) => {
      const lower = w.toLowerCase();
      // Conectores en minúscula, salvo si es la primera palabra.
      if (i > 0 && CONNECTORS.has(lower)) return lower;
      // Iniciales de una sola letra van en mayúscula.
      if (w.length === 1) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function looksLikeName(candidate: string): boolean {
  if (!candidate) return false;
  // Al menos una letra; no puramente números/símbolos.
  if (!/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(candidate)) return false;
  // Evitar líneas demasiado largas (probablemente una frase).
  if (candidate.length > 40) return false;
  return true;
}

export function parseWhatsappList(text: string): ParsedPlayer[] {
  // WhatsApp pega caracteres invisibles (U+2060 y compañía). Si no se quitan
  // acá, viajan pegados al nombre hasta la base de datos.
  const lines = stripInvisible(text).split(/\r?\n/);
  const players: ParsedPlayer[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const noEmoji = stripEmojis(rawLine);
    const clean = stripLeadingMarkers(noEmoji);
    if (!clean) continue;
    if (isTitleLine(clean)) continue;

    const goalkeeper = detectGoalkeeper(rawLine, clean);

    // ¿Dos o más jugadores en la línea?
    const parts = clean
      .split(SEPARATORS)
      .map((p) => stripLeadingMarkers(p.trim()))
      .filter((p) => looksLikeName(p));

    if (parts.length >= 2) {
      // Añadimos como una sola entrada divisible, con sugerencias.
      const suggestions = parts.map(tidyName);
      const key = suggestions.join("|").toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      players.push({
        name: suggestions[0],
        raw: rawLine.trim(),
        splittable: true,
        suggestions,
        goalkeeper,
      });
      continue;
    }

    if (!looksLikeName(clean)) continue;
    const name = tidyName(clean);
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    players.push({ name, raw: rawLine.trim(), splittable: false, goalkeeper });
  }

  return players;
}
