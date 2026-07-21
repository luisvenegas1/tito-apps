import { supabase } from "@/lib/supabase/client";
import { keepersFirst } from "@/lib/balancer/balance";
import type { Team } from "@/lib/balancer/balance";

export interface PublishedTeam {
  id: string;
  name: string;
  color: string | null;
}

/** Equipos publicados de un partido (para elegir el campeón). */
export async function listPublishedTeams(matchId: string): Promise<PublishedTeam[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, color")
    .eq("match_id", matchId)
    .eq("published", true)
    .order("created_at");
  if (error) throw error;
  return data as PublishedTeam[];
}

/**
 * Publica los equipos: borra los anteriores y guarda los nuevos + miembros.
 * `colors[i]` es el color elegido para el equipo i (puede venir vacío).
 */
export async function publishTeams(matchId: string, teams: Team[], colors: string[] = []): Promise<void> {
  // Borrar equipos anteriores del partido (cascade elimina miembros).
  await supabase.from("teams").delete().eq("match_id", matchId);

  for (let i = 0; i < teams.length; i++) {
    const t = teams[i];
    const color = colors[i] ?? null;
    const { data, error } = await supabase
      .from("teams")
      .insert({
        match_id: matchId,
        // El nombre queda como respaldo si algún día se quita el color.
        name: `Equipo ${i + 1}`,
        color,
        total_score: t.score,
        published: true,
      })
      .select()
      .single();
    if (error) throw error;
    const teamId = (data as { id: string }).id;
    // Mismo orden que en pantalla: la página pública lee los miembros en el
    // orden en que se insertan.
    const members = keepersFirst(t.players).map((p) => ({ team_id: teamId, match_player_id: p.id }));
    if (members.length) {
      const { error: mErr } = await supabase.from("team_members").insert(members);
      if (mErr) throw mErr;
    }
  }
}
