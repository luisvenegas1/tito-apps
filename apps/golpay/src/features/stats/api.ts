import { supabase } from "@/lib/supabase/client";
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

/** Carga (una vez) todo lo necesario para estadísticas del organizador. RLS limita a lo suyo. */
export async function fetchStatsData(): Promise<RawStatsData> {
  const [matches, players, results, teams, teamMembers] = await Promise.all([
    supabase.from("matches").select("id, title, date"),
    supabase.from("match_players").select("id, match_id, frequent_player_id, display_name, amount_due, amount_paid, attendance_status, payment_status"),
    supabase.from("match_results").select("match_id, winner_team_id, mvp_match_player_id"),
    supabase.from("teams").select("id, name, match_id"),
    supabase.from("team_members").select("team_id, match_player_id"),
  ]);
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
  const teamNameById = new Map(data.teams.map((t) => [t.id, t.name]));
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
