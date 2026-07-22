import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, PageHeader, Input, EmptyState } from "@titoapps/ui";
import { scaleMacros } from "@titoapps/nutrition";
import { useAuth } from "@/features/auth/AuthProvider";
import { qk } from "@/lib/query";
import { searchFoods } from "./foodsApi";
import { useAddFood } from "./useLog";
import { mealByHour } from "./helpers";
import type { Food } from "@/lib/supabase/types";

export function SearchFood() {
  const nav = useNavigate();
  const { session } = useAuth();
  const userId = session?.user.id;
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const add = useAddFood();

  const { data: results = [] } = useQuery({
    queryKey: qk.foods(q),
    queryFn: () => searchFoods(userId!, q),
    enabled: !!userId,
  });

  const confirm = () => {
    if (!selected) return;
    const m = scaleMacros(selected, grams);
    add.mutate(
      [
        {
          food_id: selected.id,
          name: selected.name,
          grams,
          meal: mealByHour(),
          kcal: m.kcal,
          protein_g: m.protein_g,
          carb_g: m.carb_g,
          fat_g: m.fat_g,
          fiber_g: m.fiber_g ?? null,
          sugar_g: m.sugar_g ?? null,
          sodium_mg: m.sodium_mg ?? null,
          source: "search" as const,
        },
      ],
      { onSuccess: () => nav("/") },
    );
  };

  return (
    <div className="p-4">
      <PageHeader title="Buscar alimento" />
      <Input className="mt-4" placeholder="Ej. pollo, arroz…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />

      {!selected && (
        <div className="mt-3 space-y-2">
          {results.length === 0 ? (
            <EmptyState title="Sin resultados" description="Creá el alimento como personalizado." />
          ) : (
            results.map((f) => (
              <button key={f.id} onClick={() => setSelected(f)} className="card block w-full text-left active:scale-[.98]">
                <div className="font-medium text-slate-800">{f.name}</div>
                <div className="text-xs text-slate-400">
                  {f.kcal} kcal/100g · P{f.protein_g} C{f.carb_g} G{f.fat_g}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {selected && (
        <div className="mt-4 space-y-3">
          <div className="card">
            <div className="font-medium text-slate-800">{selected.name}</div>
            <div className="mt-2 flex items-center gap-2">
              <Input type="number" className="w-24" value={grams} onChange={(e) => setGrams(Number(e.target.value))} />
              <span className="text-sm text-slate-400">g → {scaleMacros(selected, grams).kcal} kcal</span>
            </div>
          </div>
          <Button className="w-full" onClick={confirm} disabled={add.isPending}>
            Registrar
          </Button>
          <button className="w-full text-center text-sm text-slate-400" onClick={() => setSelected(null)}>
            Elegir otro
          </button>
        </div>
      )}
    </div>
  );
}
