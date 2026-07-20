/**
 * Colores de camiseta. Son la identidad del equipo dentro del partido:
 * en la cancha nadie dice "Equipo 3", dicen "los negros".
 *
 * El id es lo que se guarda en teams.color; el label es lo que se muestra
 * y el emoji es lo que va al mensaje de WhatsApp.
 */

export type TeamColorId = "negro" | "blanco" | "rojo" | "amarillo" | "azul" | "verde";

export interface TeamColor {
  id: TeamColorId;
  label: string;
  emoji: string;
  /** Clases Tailwind para el punto/pastilla del color. */
  dot: string;
  /** Clases para el nombre del equipo. */
  text: string;
}

export const TEAM_COLORS: TeamColor[] = [
  { id: "negro",    label: "Negro",    emoji: "⚫", dot: "bg-gray-900",                    text: "text-gray-900" },
  { id: "blanco",   label: "Blanco",   emoji: "⚪", dot: "bg-white border border-gray-300", text: "text-gray-500" },
  { id: "rojo",     label: "Rojo",     emoji: "🔴", dot: "bg-red-500",                     text: "text-red-600" },
  { id: "amarillo", label: "Amarillo", emoji: "🟡", dot: "bg-yellow-400",                  text: "text-yellow-600" },
  { id: "azul",     label: "Azul",     emoji: "🔵", dot: "bg-blue-500",                    text: "text-blue-600" },
  { id: "verde",    label: "Verde",    emoji: "🟢", dot: "bg-green-500",                   text: "text-green-600" },
];

const BY_ID = new Map(TEAM_COLORS.map((c) => [c.id, c]));

/** Color por defecto del equipo N (0-based), en el orden de la paleta. */
export function defaultColorFor(index: number): TeamColorId {
  return TEAM_COLORS[index % TEAM_COLORS.length].id;
}

/** Asigna colores por defecto a N equipos, sin repetir mientras alcancen. */
export function defaultColors(count: number): TeamColorId[] {
  return Array.from({ length: count }, (_, i) => defaultColorFor(i));
}

/** Tolerante: acepta el id guardado o un nombre viejo tipo "Equipo 1". */
export function colorOf(id: string | null | undefined): TeamColor | null {
  return id ? BY_ID.get(id.toLowerCase() as TeamColorId) ?? null : null;
}

/** Nombre para mostrar. Cae al nombre guardado si el color no se reconoce. */
export function teamLabel(color: string | null | undefined, fallback: string): string {
  return colorOf(color)?.label ?? fallback;
}

/** Emoji para el mensaje de WhatsApp. Vacío si no hay color. */
export function teamEmoji(color: string | null | undefined): string {
  return colorOf(color)?.emoji ?? "";
}
