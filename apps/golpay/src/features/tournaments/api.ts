import { supabase } from "@/lib/supabase/client";
import type { Game } from "./standings";

export interface MatchGame extends Game {
  id: string;
  match_id: string;
}

export async function listGames(matchId: string): Promise<MatchGame[]> {
  const { data, error } = await supabase
    .from("match_games")
    .select("id, match_id, home_team_id, away_team_id, home_score, away_score")
    .eq("match_id", matchId)
    .order("created_at");
  if (error) throw error;
  return data as MatchGame[];
}

export async function createGame(matchId: string, g: Game): Promise<void> {
  const { error } = await supabase.from("match_games").insert({ ...g, match_id: matchId });
  if (error) throw error;
}

export async function deleteGame(id: string): Promise<void> {
  const { error } = await supabase.from("match_games").delete().eq("id", id);
  if (error) throw error;
}
