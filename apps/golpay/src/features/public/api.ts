import { supabase } from "@/lib/supabase/client";

export interface PublicPlayer {
  id: string;
  display_name: string;
  amount_due: number;
  payment_status: string;
}

export interface PublicTeam {
  id: string;
  name: string;
  members: string[];
}

export interface PublicMatch {
  id: string;
  title: string;
  type: string;
  date: string;
  time: string | null;
  location: string | null;
  cost_per_player: number;
  status: string;
  players: PublicPlayer[];
  teams: PublicTeam[];
}

export async function getPublicMatch(token: string): Promise<PublicMatch | null> {
  const { data, error } = await supabase.rpc("get_public_match", { p_token: token });
  if (error) throw error;
  return data as PublicMatch | null;
}

export async function reportPayment(params: {
  token: string;
  pin: string;
  matchPlayerId: string;
  method?: string | null;
  note?: string | null;
  coveredIds?: string[];
}): Promise<void> {
  const { error } = await supabase.rpc("report_payment", {
    p_token: params.token,
    p_pin: params.pin,
    p_match_player_id: params.matchPlayerId,
    p_method: params.method ?? null,
    p_note: params.note ?? null,
    p_covered_ids: params.coveredIds ?? [],
  });
  if (error) throw error;
}
