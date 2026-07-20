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

export async function createFrequent(input: FrequentInput, ownerId: string): Promise<void> {
  const { error } = await supabase.from("frequent_players").insert({ ...input, owner_id: ownerId });
  if (error) throw error;
}

export async function updateFrequent(id: string, patch: Partial<FrequentInput>): Promise<void> {
  const { error } = await supabase.from("frequent_players").update(patch).eq("id", id);
  if (error) throw error;
}

/** Desactiva/reactiva un jugador (soft delete). */
export async function setActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("frequent_players").update({ is_active: active }).eq("id", id);
  if (error) throw error;
}

// Lógica pura de emparejamiento (testeable, sin Supabase).
export { findDuplicate, suggestMatches, findMatches, normalizeName } from "./matching";
export type { PlayerMatch, MatchKind } from "./matching";
