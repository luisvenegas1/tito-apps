import { supabase } from "@/lib/supabase/client";
import type { FrequentPlayer } from "@/lib/supabase/types";
import { titleCaseName } from "@/lib/names";
import { normalizeName } from "../players/matching";

/** El índice único de la BD hablando en cristiano. */
function duplicateFriendly(error: { code?: string; message: string }): Error {
  if (error.code === "23505") {
    return new Error(
      "Ese jugador ya existe en tu lista. Volvé a la vista previa y vinculalo al perfil guardado.",
    );
  }
  return new Error(error.message);
}

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
  groupId: string,
): Promise<void> {
  const clean = rows
    .map((r) => ({ ...r, name: titleCaseName(r.name) }))
    .filter((r) => r.name.length > 0);
  if (clean.length === 0) return;

  // 1) Últimas defensas contra duplicados, ya con los nombres normalizados:
  //    releemos los perfiles del organizador por si algo cambió desde la vista
  //    previa, y colapsamos repetidos dentro del mismo lote.
  const existing = await listFrequentForMatch(groupId);
  const byNorm = new Map(existing.map((f) => [normalizeName(f.name), f.id]));

  const resolved = clean.map((r) => ({
    ...r,
    frequentPlayerId: r.frequentPlayerId ?? byNorm.get(normalizeName(r.name)) ?? null,
  }));

  const createdIds: Record<string, string> = {};
  const toCreate: typeof resolved = [];
  const seen = new Set<string>();
  for (const r of resolved) {
    const key = normalizeName(r.name);
    if (r.frequentPlayerId || seen.has(key)) continue;
    seen.add(key);
    toCreate.push(r);
  }

  if (toCreate.length > 0) {
    const { data, error } = await supabase
      .from("frequent_players")
      .insert(
        toCreate.map((r) => ({
          owner_id: ownerId,
          group_id: groupId,
          name: r.name,
          can_be_goalkeeper: r.isGoalkeeper,
          skill_level: null,
        })),
      )
      .select("id, name");
    if (error) throw duplicateFriendly(error);
    (data as { id: string; name: string }[]).forEach((p) => {
      createdIds[normalizeName(p.name)] = p.id;
    });
  }

  // 2) Insertar los jugadores del partido.
  const playerRows = resolved.map((r) => ({
    match_id: matchId,
    display_name: r.name,
    amount_due: amountDue,
    is_goalkeeper: r.isGoalkeeper,
    frequent_player_id: r.frequentPlayerId ?? createdIds[normalizeName(r.name)] ?? null,
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
export async function listFrequentForMatch(groupId: string): Promise<FrequentPlayer[]> {
  const { data, error } = await supabase
    .from("frequent_players")
    .select("*")
    .eq("group_id", groupId)
    .order("name");
  if (error) throw error;
  return data as FrequentPlayer[];
}
