import { useState } from "react";
import type { PlanCategory } from "@/lib/supabase/types";
import { mealByHour } from "@/features/log/helpers";
import { useAddExchanges } from "./usePro";

const AMOUNTS = [0.5, 1, 1.5, 2];

/**
 * Registro RÁPIDO de intercambios: un toque para sumar +0.5 / +1 / +1.5 / +2
 * a cualquier categoría del plan. Recalcula el progreso al instante.
 */
export function ProQuickAdd({ categories, date }: { categories: PlanCategory[]; date: string }) {
  const add = useAddExchanges(date);
  const [openId, setOpenId] = useState<string | null>(null);
  const active = categories.filter((c) => c.is_active);

  const quick = (c: PlanCategory, amount: number) => {
    add.mutate([{ category_id: c.id, amount, source: "quick", meal: mealByHour() }]);
    setOpenId(null);
  };

  if (active.length === 0) return null;

  return (
    <div className="space-y-2">
      {active.map((c) => (
        <div key={c.id} className="rounded-2xl bg-white p-2 ring-1 ring-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => quick(c, 1)}
              disabled={add.isPending}
              className="flex flex-1 items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-left font-semibold text-green-800 active:scale-[.99] disabled:opacity-60"
            >
              <span className="text-lg" aria-hidden>{c.emoji ?? "➕"}</span>
              <span>+ {c.name}</span>
            </button>
            <button
              type="button"
              onClick={() => setOpenId(openId === c.id ? null : c.id)}
              className="rounded-xl px-3 py-2 text-sm text-slate-500 ring-1 ring-slate-200 active:scale-95"
              aria-label={`Elegir cantidad de ${c.name}`}
            >
              ½·1·2
            </button>
          </div>
          {openId === c.id && (
            <div className="mt-2 flex flex-wrap gap-2">
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => quick(c, a)}
                  disabled={add.isPending}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 active:scale-95 disabled:opacity-60"
                >
                  +{a}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
