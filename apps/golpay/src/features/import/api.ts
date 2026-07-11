import { supabase } from "@/lib/supabase/client";
import type { FrequentPlayer } from "@/lib/supabase/types";

export interface ImportRow {
  name: string;
  isGoalkeeper: boolean;
  /** Perfil vinculado si el jugador ya existe en la BD. */
  frequentPlayerId: string | null;
}

/**
 * Inserta los jugadores en el partido.
 * - Si la fila NO está vinculada a un perfil existente, crea uno nuevo
 *   (así la próxima vez el jugador viene pre-cargado).
 * - Guarda is_goalkeeper por partido (el portero puede variar cada semana).
 * - No sobrescribe el can_be_goalkeeper del perfil ya existente.
 */
export async function importPlayers(
  matchId: string,
  rows: ImportRow[],
  amountDue: number,
  ownerId: string,
): Promise<void> {
  const clean = rows
    .map((r) => ({ ...r, name: r.name.trim() }))
    .filter((r) => r.name.length > 0);
  if (clean.length === 0) return;

  // 1) Crear perfiles para los jugadores nuevos (sin frequentPlayerId).
  const toCreate = clean.filter((r) => !r.frequentPlayerId);
  const createdIds: Record<string, string> = {};
  if (toCreate.length > 0) {
    const { data, error } = await supabase
      .from("frequent_players")
      .insert(
        toCreate.map((r) => ({
          owner_id: ownerId,
          name: r.name,
          can_be_goalkeeper: r.isGoalkeeper,
          skill_level: null,
        })),
      )
      .select("id, name");
    if (error) throw error;
    (data as { id: string; name: string }[]).forEach((p) => {
      createdIds[p.name.toLowerCase()] = p.id;
    });
  }

  // 2) Insertar los jugadores del partido.
  const playerRows = clean.map((r) => ({
    match_id: matchId,
    display_name: r.name,
    amount_due: amountDue,
    is_goalkeeper: r.isGoalkeeper,
    frequent_player_id: r.frequentPlayerId ?? createdIds[r.name.toLowerCase()] ?? null,
  }));

  const { error } = await supabase.from("match_players").insert(playerRows);
  if (error) throw error;

  // 3) Actualizar última participación de los perfiles usados.
  const usedIds = playerRows.map((p) => p.frequent_player_id).filter(Boolean) as string[];
  if (usedIds.length > 0) {
    await supabase
      .from("frequent_players")
      .update({ last_played_at: new Date().toISOString() })
      .in("id", usedIds);
  }
}

/** Trae los perfiles del organizador para emparejar al importar. */
export async function listFrequentForMatch(): Promise<FrequentPlayer[]> {
  const { data, error } = await supabase.from("frequent_players").select("*").order("name");
  if (error) throw error;
  return data as FrequentPlayer[];
}
