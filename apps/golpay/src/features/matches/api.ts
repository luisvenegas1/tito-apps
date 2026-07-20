import { supabase } from "@/lib/supabase/client";
import type {
  Match, MatchPlayer, PaymentStatus, AttendanceStatus, MatchTemplate, MatchResult,
} from "@/lib/supabase/types";
import { paymentPatch } from "../payments/transitions";

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
  const t = paymentPatch(player, status, amountPaid);
  const patch: Partial<MatchPlayer> = {
    payment_status: t.payment_status,
    confirmed_at: t.confirmed ? new Date().toISOString() : null,
  };
  if (t.amount_paid !== undefined) patch.amount_paid = t.amount_paid;

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

// -------- Asistencia (organizador: check-in / ajuste manual) --------

export async function setAttendance(playerId: string, status: AttendanceStatus): Promise<void> {
  const patch: Record<string, unknown> = { attendance_status: status };
  if (status === "confirmado") patch.confirmed_attendance_at = new Date().toISOString();
  const { error } = await supabase.from("match_players").update(patch).eq("id", playerId);
  if (error) throw error;
}

export async function setListClosed(matchId: string, closed: boolean): Promise<void> {
  const { error } = await supabase.from("matches").update({ list_closed: closed }).eq("id", matchId);
  if (error) throw error;
}

/** URL temporal (60s) para ver un comprobante; solo el dueño puede (RLS). */
export async function getProofUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60);
  if (error) return null;
  return data.signedUrl;
}

// -------- Plantillas --------

export async function listTemplates(): Promise<MatchTemplate[]> {
  const { data, error } = await supabase.from("match_templates").select("*").order("name");
  if (error) throw error;
  return data as MatchTemplate[];
}

export async function createTemplate(
  input: Omit<MatchTemplate, "id" | "owner_id" | "created_at">,
  ownerId: string,
): Promise<void> {
  const { error } = await supabase.from("match_templates").insert({ ...input, owner_id: ownerId });
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("match_templates").delete().eq("id", id);
  if (error) throw error;
}

// -------- Resultados / campeones --------

export async function getResult(matchId: string): Promise<MatchResult | null> {
  const { data, error } = await supabase.from("match_results").select("*").eq("match_id", matchId).maybeSingle();
  if (error) throw error;
  return (data as MatchResult) ?? null;
}

export async function saveResult(input: {
  match_id: string;
  winner_team_id: string | null;
  mvp_match_player_id: string | null;
  score: string | null;
}): Promise<void> {
  const { error } = await supabase.from("match_results").upsert(input, { onConflict: "match_id" });
  if (error) throw error;
}

export interface ChampionRow {
  match_id: string;
  title: string;
  date: string;
  winner_team_name: string | null;
  mvp_name: string | null;
  score: string | null;
}

/** Historial de campeones (partidos con resultado registrado). */
export async function listChampions(): Promise<ChampionRow[]> {
  const { data, error } = await supabase
    .from("match_results")
    .select("match_id, score, winner_team_id, mvp_match_player_id, matches(title, date), teams:winner_team_id(name), mvp:mvp_match_player_id(display_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as any[]).map((r) => ({
    match_id: r.match_id,
    title: r.matches?.title ?? "",
    date: r.matches?.date ?? "",
    winner_team_name: r.teams?.name ?? null,
    mvp_name: r.mvp?.display_name ?? null,
    score: r.score ?? null,
  }));
}
