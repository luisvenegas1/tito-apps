import { supabase } from "@/lib/supabase/client";
import type { Match, MatchPlayer, PaymentStatus } from "@/lib/supabase/types";

export async function listMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return data as Match[];
}

export async function getMatch(id: string): Promise<Match> {
  const { data, error } = await supabase.from("matches").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Match;
}

export interface MatchInput {
  title: string;
  type: "mejenga" | "torneo";
  date: string;
  time: string | null;
  location: string | null;
  cost_per_player: number;
  max_players: number | null;
  notes: string | null;
}

export async function createMatch(input: MatchInput, ownerId: string): Promise<Match> {
  const { data, error } = await supabase
    .from("matches")
    .insert({ ...input, owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;
  return data as Match;
}

export async function updateMatch(id: string, input: Partial<MatchInput>): Promise<Match> {
  const { data, error } = await supabase.from("matches").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as Match;
}

export async function deleteMatch(id: string): Promise<void> {
  const { error } = await supabase.from("matches").delete().eq("id", id);
  if (error) throw error;
}

/** Setea/rota el PIN vía RPC (se hashea en el servidor). */
export async function setMatchPin(matchId: string, pin: string): Promise<void> {
  const { error } = await supabase.rpc("set_match_pin", { p_match_id: matchId, p_pin: pin });
  if (error) throw error;
}

// -------- Jugadores del partido --------

export async function listMatchPlayers(matchId: string): Promise<MatchPlayer[]> {
  const { data, error } = await supabase
    .from("match_players")
    .select("*")
    .eq("match_id", matchId)
    .order("display_name");
  if (error) throw error;
  return data as MatchPlayer[];
}

export async function addPlayers(
  matchId: string,
  names: string[],
  amountDue: number,
): Promise<void> {
  if (names.length === 0) return;
  const rows = names.map((display_name) => ({
    match_id: matchId,
    display_name,
    amount_due: amountDue,
  }));
  const { error } = await supabase.from("match_players").insert(rows);
  if (error) throw error;
}

export async function updatePlayer(id: string, patch: Partial<MatchPlayer>): Promise<void> {
  const { error } = await supabase.from("match_players").update(patch).eq("id", id);
  if (error) throw error;
}

export async function removePlayer(id: string): Promise<void> {
  const { error } = await supabase.from("match_players").delete().eq("id", id);
  if (error) throw error;
}

/** Cambia el estado de pago y registra el evento (organizador). */
export async function setPaymentStatus(
  player: MatchPlayer,
  status: PaymentStatus,
  ownerId: string,
  amountPaid?: number,
): Promise<void> {
  const patch: Partial<MatchPlayer> = {
    payment_status: status,
    confirmed_at: status === "confirmado" ? new Date().toISOString() : null,
  };
  if (amountPaid !== undefined) patch.amount_paid = amountPaid;
  if (status === "confirmado") patch.amount_paid = player.amount_due;
  if (status === "pendiente") patch.amount_paid = 0;

  const { error } = await supabase.from("match_players").update(patch).eq("id", player.id);
  if (error) throw error;

  await supabase.from("payment_events").insert({
    match_player_id: player.id,
    old_status: player.payment_status,
    new_status: status,
    changed_by: "organizer",
    actor_id: ownerId,
    amount: patch.amount_paid ?? null,
  });
}
