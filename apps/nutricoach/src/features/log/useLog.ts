import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query";
import { useAuth } from "@/features/auth/AuthProvider";
import { todayISO } from "@/lib/date";
import { listLogItems, addLogItems, deleteLogItem, type NewLogItem } from "./api";
import type { LogItem } from "@/lib/supabase/types";

export function useDailyLog(date = todayISO()) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: qk.log(date),
    queryFn: () => listLogItems(userId!, date),
    enabled: !!userId,
  });
}

export function useAddFood(date = todayISO()) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: NewLogItem[]) => addLogItems(userId!, date, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.log(date) });
      qc.invalidateQueries({ queryKey: qk.dashboard(date) });
    },
  });
}

export function useDeleteFood(date = todayISO()) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLogItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.log(date) });
      qc.invalidateQueries({ queryKey: qk.dashboard(date) });
    },
  });
}

/** Convierte un LogItem guardado en el input para volver a insertarlo (deshacer). */
function toNewItem(it: LogItem): NewLogItem {
  return {
    food_id: it.food_id,
    name: it.name,
    grams: it.grams,
    meal: it.meal,
    kcal: it.kcal,
    protein_g: it.protein_g,
    carb_g: it.carb_g,
    fat_g: it.fat_g,
    fiber_g: it.fiber_g,
    sugar_g: it.sugar_g,
    sodium_mg: it.sodium_mg,
    source: it.source,
    confidence: it.confidence,
  };
}

/**
 * Borrar una comida ya guardada con opción de **deshacer**.
 * Al borrar (y al deshacer) se recalculan calorías/macros del día porque se
 * invalidan las queries de log y dashboard.
 */
export function useRemovableLog(date = todayISO()) {
  const del = useDeleteFood(date);
  const add = useAddFood(date);
  const [removed, setRemoved] = useState<LogItem | null>(null);

  const remove = (it: LogItem) => {
    setRemoved(it);
    del.mutate(it.id);
  };

  const undo = () => {
    if (!removed) return;
    add.mutate([toNewItem(removed)]);
    setRemoved(null);
  };

  return {
    removed,
    remove,
    undo,
    dismiss: () => setRemoved(null),
    pending: del.isPending || add.isPending,
  };
}
