import { supabase } from "@/lib/supabase/client";
import type { Team } from "@/lib/balancer/balance";

/** Publica los equipos: borra los anteriores y guarda los nuevos + miembros. */
export async function publishTeams(matchId: string, teams: Team[]): Promise<void> {
  // Borrar equipos anteriores del partido (cascade elimina miembros).
  await supabase.from("teams").delete().eq("match_id", matchId);

  for (let i = 0; i < teams.length; i++) {
    const t = teams[i];
    const { data, error } = await supabase
      .from("teams")
      .insert({ match_id: matchId, name: `Equipo ${i + 1}`, total_score: t.score, published: true })
      .select()
      .single();
    if (error) throw error;
    const teamId = (data as { id: string }).id;
    const members = t.players.map((p) => ({ team_id: teamId, match_player_id: p.id }));
    if (members.length) {
      const { error: mErr } = await supabase.from("team_members").insert(members);
      if (mErr) throw mErr;
    }
  }
}
