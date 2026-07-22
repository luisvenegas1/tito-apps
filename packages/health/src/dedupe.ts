import type { NormalizedWorkout } from "./types";

/**
 * Filtra los entrenamientos ya importados comparando `externalId` contra los
 * IDs existentes. Los que no tienen externalId se dejan pasar (se resolverán
 * por el índice único de la BD o quedan como manuales). Puro y testeable.
 */
export function dedupeByExternalId(
  incoming: NormalizedWorkout[],
  existingExternalIds: Iterable<string>,
): NormalizedWorkout[] {
  const seen = new Set(existingExternalIds);
  const out: NormalizedWorkout[] = [];
  for (const w of incoming) {
    if (w.externalId && seen.has(w.externalId)) continue;
    if (w.externalId) seen.add(w.externalId); // evita duplicados dentro del mismo lote
    out.push(w);
  }
  return out;
}
