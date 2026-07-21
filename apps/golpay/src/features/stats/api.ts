import { supabase } from "@/lib/supabase/client";
import { teamLabel } from "@/lib/teamColors";
import type { PlayerMatchRow } from "./stats";

export interface RawStatsData {
  matches: { id: string; title: string; date: string }[];
  players: {
    id: string; match_id: string; frequent_player_id: string | null; display_name: string;
    amount_due: number; amount_paid: number; attendance_status: string; payment_status: string;
  }[];
  results: { match_id: string; winner_team_id: string | null; mvp_match_player_id: string | null }[];
  teams: { id: string; name: string; match_id: string }[];
  teamMembers: { team_id: string; match_player_id: string }[];
}

/**
 * Carga (una vez) todo lo necesario para estadísticas del grupo.
 * Filtramos por los partidos del grupo: RLS ya limita a los grupos donde estás,
 * pero sin este filtro se mezclarían las estadísticas de todos tus grupos.
 */
export async function fetchStatsData(groupId: string): Promise<RawStatsData> {
  const { data: gm } = await supabase.from("matches").select("id").eq("group_id", groupId);
  const matchIds = (gm ?? []).map((m: { id: string }) => m.id);
  if (matchIds.length === 0) {
    return { matches: [], players: [], results: [], teams: [], teamMembers: [] };
  }

  const [matches, players, results, teams] = await Promise.all([
    supabase.from("matches").select("id, title, date").in("id", matchIds),
    supabase
      .from("match_players")
      .select("id, match_id, frequent_player_id, display_name, amount_due, amount_paid, attendance_status, payment_status")
      .in("match_id", matchIds),
    supabase.from("match_results").select("match_id, winner_team_id, mvp_match_player_id").in("match_id", matchIds),
    supabase.from("teams").select("id, name, match_id, color").in("match_id", matchIds),
  ]);

  // team_members se filtra por los equipos que acabamos de traer.
  const teamIds = ((teams.data as { id: string }[]) ?? []).map((t) => t.id);
  const teamMembers = teamIds.length
    ? await supabase.from("team_members").select("team_id, match_player_id").in("team_id", teamIds)
    : { data: [] as RawStatsData["teamMembers"] };

  return {
    matches: (matches.data as RawStatsData["matches"]) ?? [],
    players: (players.data as RawStatsData["players"]) ?? [],
    results: (results.data as RawStatsData["results"]) ?? [],
    teams: (teams.data as RawStatsData["teams"]) ?? [],
    teamMembers: (teamMembers.data as RawStatsData["teamMembers"]) ?? [],
  };
}

/** Convierte match_players (filtrados) en filas para playerStats. */
export function buildRows(
  data: RawStatsData,
  filter: (mp: RawStatsData["players"][number]) => boolean,
): PlayerMatchRow[] {
  const matchById = new Map(data.matches.map((m) => [m.id, m]));
  const resultByMatch = new Map(data.results.map((r) => [r.match_id, r]));
  const teamNameById = new Map(data.teams.map((t) => [t.id, teamLabel((t as { color?: string | null }).color, t.name)]));
  const teamByMp = new Map(data.teamMembers.map((tm) => [tm.match_player_id, tm.team_id]));

  return data.players
    .filter(filter)
    .map((mp) => {
      const m = matchById.get(mp.match_id);
      const res = resultByMatch.get(mp.match_id);
      const teamId = teamByMp.get(mp.id) ?? null;
      return {
        match_id: mp.match_id,
        date: m?.date ?? "",
        attendance_status: mp.attendance_status,
        payment_status: mp.payment_status,
        team_name: teamId ? teamNameById.get(teamId) ?? null : null,
        is_champion: teamId != null && res?.winner_team_id === teamId,
        is_mvp: res?.mvp_match_player_id === mp.id,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
