import { supabase } from "@/lib/supabase/client";
import type { FrequentPlayer } from "@/lib/supabase/types";

export async function listFrequent(): Promise<FrequentPlayer[]> {
  const { data, error } = await supabase.from("frequent_players").select("*").order("name");
  if (error) throw error;
  return data as FrequentPlayer[];
}

export type FrequentInput = Omit<FrequentPlayer, "id" | "owner_id" | "created_at" | "last_played_at">;

export async function createFrequent(input: FrequentInput, ownerId: string): Promise<void> {
  const { error } = await supabase.from("frequent_players").insert({ ...input, owner_id: ownerId });
  if (error) throw error;
}

export async function updateFrequent(id: string, patch: Partial<FrequentInput>): Promise<void> {
  const { error } = await supabase.from("frequent_players").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteFrequent(id: string): Promise<void> {
  const { error } = await supabase.from("frequent_players").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Sugiere posibles coincidencias entre un nombre importado y jugadores frecuentes.
 * NO fusiona: sólo sugiere. La UI confirma.
 */
export function suggestMatches(name: string, frequent: FrequentPlayer[]): FrequentPlayer[] {
  const n = name.toLowerCase().trim();
  return frequent.filter((f) => {
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
