import { copyToClipboard } from "@/components/ui/toast";

export interface SummaryInput {
  title: string;
  dateLabel?: string;
  teams: { name: string; members?: string[] }[];
  champion?: string | null;
  mvp?: string | null;
  score?: string | null;
}

/** Texto de resumen listo para WhatsApp (puro/testeable). */
export function matchSummary(m: SummaryInput): string {
  const lines: string[] = [`⚽ ${m.title}`];
  if (m.dateLabel) lines.push(m.dateLabel);
  if (m.teams.length > 0) {
    lines.push("");
    for (const t of m.teams) {
      lines.push(`🔸 ${t.name}${t.members && t.members.length ? ": " + t.members.join(", ") : ""}`);
    }
  }
  if (m.champion) {
    lines.push("");
    lines.push(`🏆 Campeón: ${m.champion}${m.score ? ` (${m.score})` : ""}`);
  }
  if (m.mvp) lines.push(`⭐ MVP: ${m.mvp}`);
  return lines.join("\n");
}

/** Comparte por Web Share API con fallback a portapapeles. */
export async function shareText(text: string): Promise<"shared" | "copied" | "failed"> {
  const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
  if (typeof nav.share === "function") {
    try {
      await nav.share({ text });
      return "shared";
    } catch {
      // el usuario canceló o falló → intentamos copiar
    }
  }
  return (await copyToClipboard(text)) ? "copied" : "failed";
}
