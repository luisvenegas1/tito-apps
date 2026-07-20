import { teamEmoji } from "@/lib/teamColors";

export interface ShareTeam {
  color: string | null;
  /** Nombre a usar si el equipo no tiene color. */
  name: string;
  players: string[];
}

/**
 * Texto de los equipos tal como se manda al grupo de WhatsApp:
 *
 *   ⚫Sánchez Chino Roly Chamo Memo Leo
 *   🔵Juanpi SebasC Jota Fabián Jimmy Mau
 *
 * Un equipo por línea, emoji del color pegado al primer nombre y los nombres
 * separados por espacio (así lo escriben ellos). Si un equipo no tiene color,
 * se usa su nombre y dos puntos para que igual se entienda.
 */
export function teamsMessage(teams: ShareTeam[]): string {
  return teams
    .map((t) => {
      const names = t.players.filter((n) => n.trim()).join(" ");
      const emoji = teamEmoji(t.color);
      return emoji ? `${emoji}${names}` : `${t.name}: ${names}`;
    })
    .join("\n");
}

/** Igual que el anterior pero con encabezado del partido. */
export function teamsMessageWithTitle(title: string, dateLabel: string, teams: ShareTeam[]): string {
  return `⚽ ${title} · ${dateLabel}\n\n${teamsMessage(teams)}`;
}
