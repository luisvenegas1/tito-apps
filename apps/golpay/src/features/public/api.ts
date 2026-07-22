import { supabase } from "@/lib/supabase/client";

export interface PublicPlayer {
  id: string;
  display_name: string;
  amount_due: number;
  payment_status: string;
  attendance_status: string;
  is_goalkeeper?: boolean;
}

export interface PublicTeam {
  id: string;
  name: string;
  /** id del color de camiseta (negro, blanco, rojo…). Null en equipos viejos. */
  color: string | null;
  members: string[];
}

export interface PublicResult {
  winner_team_name: string | null;
  mvp_name: string | null;
  score: string | null;
}

export interface PublicSinpe {
  number: string;
  name: string | null;
}

export interface PublicMatch {
  id: string;
  title: string;
  type: string;
  date: string;
  time: string | null;
  location: string | null;
  cost_per_player: number;
  cost_mode: "fijo" | "dividido" | "gratis";
  total_amount: number | null;
  status: string;
  list_closed: boolean;
  max_players: number | null;
  players: PublicPlayer[];
  teams: PublicTeam[];
  result: PublicResult | null;
  sinpe: PublicSinpe | null;
}

export async function getPublicMatch(token: string): Promise<PublicMatch | null> {
  const { data, error } = await supabase.rpc("get_public_match", { p_token: token });
  if (error) throw error;
  return data as PublicMatch | null;
}

export async function reportPayment(params: {
  token: string;
  matchPlayerId: string;
  method?: string | null;
  note?: string | null;
  coveredIds?: string[];
  proofPath?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("report_payment", {
    p_token: params.token,
    p_match_player_id: params.matchPlayerId,
    p_method: params.method ?? null,
    p_note: params.note ?? null,
    p_covered_ids: params.coveredIds ?? [],
    p_proof_path: params.proofPath ?? null,
  });
  if (error) throw error;
}

const PROOF_BUCKET = "payment-proofs";

/**
 * Sube un comprobante: pide una signed upload URL a la Edge Function
 * (que valida que el jugador pertenezca al partido del token) y sube el
 * archivo. Devuelve la ruta.
 */
export async function uploadProof(params: {
  token: string;
  matchPlayerId: string;
  file: File;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("upload-proof", {
    body: {
      token: params.token,
      matchPlayerId: params.matchPlayerId,
      contentType: params.file.type,
    },
  });
  if (error || !data?.path) throw new Error("No se pudo preparar la subida del comprobante");
  const up = await supabase.storage.from(PROOF_BUCKET).uploadToSignedUrl(data.path, data.token, params.file);
  if (up.error) throw new Error("No se pudo subir el comprobante");
  return data.path as string;
}

/** RSVP del jugador. El enlace secreto es la credencial. */
export async function setAttendance(params: {
  token: string;
  matchPlayerId: string;
  status: "confirmado" | "declinado" | "tal_vez";
}): Promise<{ status: string }> {
  const { data, error } = await supabase.rpc("set_attendance", {
    p_token: params.token,
    p_match_player_id: params.matchPlayerId,
    p_status: params.status,
  });
  if (error) throw error;
  return data as { status: string };
}
