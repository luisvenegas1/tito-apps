import { supabase } from "@/lib/supabase/client";
import type { FrequentPlayer } from "@/lib/supabase/types";

export async function listFrequent(groupId: string): Promise<FrequentPlayer[]> {
  const { data, error } = await supabase
    .from("frequent_players")
    .select("*")
    .eq("group_id", groupId)
    .order("name");
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

export async function createFrequent(
  input: FrequentInput,
  ownerId: string,
  groupId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("frequent_players")
    .insert({ ...input, owner_id: ownerId, group_id: groupId })
    .select("id");
  if (error) throw friendly(error);
  if (!data || data.length === 0) {
    throw new Error("No se creó el jugador (la base no aceptó la fila).");
  }
}

/**
 * Ojo: sin .select(), PostgREST responde 204 aunque no haya actualizado NADA
 * (p. ej. si RLS filtra la fila). Eso se veía como "guardé y no cambió".
 * Pedimos la fila de vuelta y comprobamos que efectivamente cambió.
 */
export async function updateFrequent(id: string, patch: Partial<FrequentInput>): Promise<void> {
  const { data, error } = await supabase
    .from("frequent_players")
    .update(patch)
    .eq("id", id)
    .select("id, name");
  if (error) throw friendly(error);

  if (!data || data.length === 0) {
    throw new Error(
      "La base no actualizó ninguna fila. Suele ser que el jugador pertenece a otra cuenta " +
        "(owner_id distinto al usuario con el que iniciaste sesión).",
    );
  }
  if (patch.name !== undefined && data[0].name !== patch.name) {
    throw new Error(`Guardaste “${patch.name}” pero la base devolvió “${data[0].name}”.`);
  }
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
