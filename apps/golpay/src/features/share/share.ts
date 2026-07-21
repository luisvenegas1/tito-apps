import { teamEmoji } from "@/lib/teamColors";

export interface SummaryTeam {
  name: string;
  /** id del color (negro, azul…). Si viene, se usa su emoji en vez de 🔸. */
  color?: string | null;
  members?: string[];
}

export interface SummaryInput {
  title: string;
  dateLabel?: string;
  teams: SummaryTeam[];
  champion?: string | null;
  /** Color del campeón, para el emoji del 🏆. */
  championColor?: string | null;
  mvp?: string | null;
  score?: string | null;
}

/** Emoji del equipo: su color si lo tiene, si no un rombo neutro. */
function bullet(color: string | null | undefined): string {
  return teamEmoji(color) || "🔸";
}

/** Texto de resumen listo para WhatsApp (puro/testeable). */
export function matchSummary(m: SummaryInput): string {
  const lines: string[] = [`⚽ ${m.title}`];
  if (m.dateLabel) lines.push(m.dateLabel);
  if (m.teams.length > 0) {
    lines.push("");
    for (const t of m.teams) {
      const names = t.members && t.members.length ? ": " + t.members.join(", ") : "";
      lines.push(`${bullet(t.color)} ${t.name}${names}`);
    }
  }
  if (m.champion) {
    lines.push("");
    lines.push(`🏆 Campeón: ${bullet(m.championColor)} ${m.champion}${m.score ? ` (${m.score})` : ""}`);
  }
  if (m.mvp) lines.push(`⭐ MVP: ${m.mvp}`);
  return lines.join("\n");
}

/**
 * Abre WhatsApp con el texto ya escrito. En el celular abre la app; en la
 * compu abre WhatsApp Web. Es lo que el organizador va a hacer siempre, así que
 * evitamos el menú "Compartir con…" del sistema (Web Share API).
 */
export function shareToWhatsapp(text: string): void {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}
