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
  "id" | "owner_id" | "created_at" | "last_played_at" | "is_active"
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

/** Devuelve un jugador ACTIVO con el mismo nombre (para evitar duplicados). */
export function findDuplicate(
  name: string,
  list: FrequentPlayer[],
  excludeId?: string,
): FrequentPlayer | null {
  const n = name.toLowerCase().trim();
  return (
    list.find(
      (f) => f.is_active && f.id !== excludeId && f.name.toLowerCase().trim() === n,
    ) ?? null
  );
}

/**
 * Sugiere posibles coincidencias entre un nombre importado y jugadores frecuentes
 * ACTIVOS. NO fusiona: sólo sugiere. La UI confirma.
 */
export function suggestMatches(name: string, frequent: FrequentPlayer[]): FrequentPlayer[] {
  const n = name.toLowerCase().trim();
  return frequent.filter((f) => {
    if (!f.is_active) return false;
    const fn = f.name.toLowerCase();
    const nick = (f.nickname ?? "").toLowerCase();
    return (
      fn === n ||
      nick === n ||
      fn.startsWith(n) ||
      n.startsWith(fn) ||
      (fn.split(" ")[0] === n.split(" ")[0] && n.length > 2)
    );
  });
}
