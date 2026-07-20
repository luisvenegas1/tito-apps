import { supabase } from "@/lib/supabase/client";
import type { FrequentPlayer } from "@/lib/supabase/types";

export async function listFrequent(): Promise<FrequentPlayer[]> {
  const { data, error } = await supabase.from("frequent_players").select("*").order("name");
  if (error) throw error;
  return data as FrequentPlayer[];
}

// El input de creación/edición no incluye is_active (se gestiona con setActive).
export type FrequentInput = Omit<
  FrequentPlayer,
  "id" | "owner_id" | "created_at" | "last_played_at" | "is_active" | "suggested_level"
>;

/** Traduce el índice único (owner_id, name_norm) a un mensaje entendible. */
function friendly(error: { code?: string; message: string }): Error {
  if (error.code === "23505") {
    return new Error("Ya tenés un jugador con ese nombre. Editá el existente en vez de crear otro.");
  }
  return new Error(error.message);
}

export async function createFrequent(input: FrequentInput, ownerId: string): Promise<void> {
  const { error } = await supabase.from("frequent_players").insert({ ...input, owner_id: ownerId });
  if (error) throw friendly(error);
}

export async function updateFrequent(id: string, patch: Partial<FrequentInput>): Promise<void> {
  const { error } = await supabase.from("frequent_players").update(patch).eq("id", id);
  if (error) throw friendly(error);
}

/**
 * Fusiona dos perfiles: los partidos del descartado pasan al que se conserva,
 * y el conservado hereda los datos que le falten. Irreversible.
 */
export async function mergeFrequent(keepId: string, dropId: string): Promise<void> {
  const { error } = await supabase.rpc("merge_frequent_players", { keep_id: keepId, drop_id: dropId });
  if (error) throw new Error(error.message);
}

/** Desactiva/reactiva un jugador (soft delete). */
export async function setActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("frequent_players").update({ is_active: active }).eq("id", id);
  if (error) throw error;
}

// Lógica pura de emparejamiento (testeable, sin Supabase).
export { findDuplicate, suggestMatches, findMatches, normalizeName, duplicateGroups } from "./matching";
export type { PlayerMatch, MatchKind } from "./matching";
