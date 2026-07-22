import type { LogItem } from "@/lib/supabase/types";

/** Un alimento agrupado con su frecuencia y el último snapshot registrado. */
export interface FrequentEntry {
  key: string;
  name: string;
  count: number;
  last: LogItem;
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Agrupa items por nombre normalizado, contando frecuencia y guardando el
 * registro más reciente (para re-registrar en un toque con los mismos macros).
 * Puro y testeable. `items` debe venir del más reciente al más antiguo.
 */
export function groupFrequents(items: LogItem[]): FrequentEntry[] {
  const map = new Map<string, FrequentEntry>();
  for (const it of items) {
    const key = it.food_id ?? norm(it.name);
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, { key, name: it.name, count: 1, last: it });
    }
  }
  return [...map.values()];
}

/** Los N alimentos más frecuentes (desempata por recencia del último registro). */
export function topFrequent(items: LogItem[], n = 6): FrequentEntry[] {
  return groupFrequents(items)
    .sort((a, b) => b.count - a.count || b.last.created_at.localeCompare(a.last.created_at))
    .slice(0, n);
}
