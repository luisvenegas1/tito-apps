import { useState } from "react";
import { Button, Input, Spinner } from "@titoapps/ui";
import type { DetectedFoodItem } from "@/lib/ai/contracts";
import { estimateMacros } from "./estimate";

type EditItem = DetectedFoodItem & { _dirty?: boolean };

const EMPTY: EditItem = {
  name: "",
  grams: 100,
  kcal: 0,
  protein_g: 0,
  carb_g: 0,
  fat_g: 0,
  confidence: 1,
  _dirty: true,
};

interface Props {
  initialItems: DetectedFoodItem[];
  isSaving: boolean;
  onConfirm: (items: DetectedFoodItem[]) => void;
  onBack?: () => void;
  backLabel?: string;
}

/**
 * Editor de la lista de alimentos detectados (foto o texto).
 * - Quitar un ítem se puede **deshacer** (por si tocás la ✕ sin querer).
 * - Al renombrar o agregar un alimento, se marca para **recalcular** sus macros
 *   con la IA — nunca se guarda una comida en 0 kcal.
 */
export function MealItemsEditor({ initialItems, isSaving, onConfirm, onBack, backLabel }: Props) {
  const [list, setList] = useState<EditItem[]>(
    initialItems.length ? initialItems.map((it) => ({ ...it })) : [{ ...EMPTY }],
  );
  const [removed, setRemoved] = useState<{ index: number; item: EditItem } | null>(null);
  const [calc, setCalc] = useState<Set<number>>(new Set());
  const [finalizing, setFinalizing] = useState(false);

  const needsCalc = (it: EditItem) => !!it.name.trim() && (it.kcal === 0 || !!it._dirty);

  const setName = (i: number, name: string) =>
    setList((prev) => prev.map((it, idx) => (idx === i ? { ...it, name, _dirty: true } : it)));

  const setGrams = (i: number, grams: number) =>
    setList((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it;
        if (it.kcal > 0) {
          const f = grams / (it.grams || 1);
          return {
            ...it,
            grams,
            kcal: Math.round(it.kcal * f),
            protein_g: +(it.protein_g * f).toFixed(1),
            carb_g: +(it.carb_g * f).toFixed(1),
            fat_g: +(it.fat_g * f).toFixed(1),
          };
        }
        return { ...it, grams, _dirty: true };
      }),
    );

  const remove = (i: number) => {
    setList((prev) => {
      setRemoved({ index: i, item: prev[i] });
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const undo = () => {
    if (!removed) return;
    setList((prev) => {
      const copy = [...prev];
      copy.splice(Math.min(removed.index, copy.length), 0, removed.item);
      return copy;
    });
    setRemoved(null);
  };

  const addItem = () => {
    setRemoved(null);
    setList((prev) => [...prev, { ...EMPTY }]);
  };

  const recalc = async (i: number) => {
    const it = list[i];
    if (!it.name.trim() || it.grams <= 0) return;
    setCalc((prev) => new Set(prev).add(i));
    try {
      const m = await estimateMacros(it.name, it.grams);
      setList((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...m, _dirty: false } : x)));
    } finally {
      setCalc((prev) => {
        const n = new Set(prev);
        n.delete(i);
        return n;
      });
    }
  };

  const confirm = async () => {
    setFinalizing(true);
    try {
      // Auto-recalcula cualquier fila con nombre pero macros en 0 o modificada.
      const next = [...list];
      for (let i = 0; i < next.length; i++) {
        const it = next[i];
        if (!it.name.trim() || it.grams <= 0) continue;
        if (it.kcal === 0 || it._dirty) {
          const m = await estimateMacros(it.name, it.grams);
          next[i] = { ...it, ...m, _dirty: false };
        }
      }
      onConfirm(next.filter((it) => it.name.trim() && it.grams > 0));
    } finally {
      setFinalizing(false);
    }
  };

  const busy = isSaving || finalizing;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Revisá, corregí o quitá lo que haga falta:</p>

      {removed && (
        <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>Quitaste "{removed.item.name || "alimento"}".</span>
          <button onClick={undo} className="font-semibold underline">
            Deshacer
          </button>
        </div>
      )}

      {list.map((it, i) => (
        <div key={i} className="card">
          <div className="flex items-center gap-2">
            <Input
              value={it.name}
              onChange={(e) => setName(i, e.target.value)}
              placeholder="Nombre del alimento"
              className="flex-1"
            />
            <button
              onClick={() => remove(i)}
              className="text-slate-400 hover:text-red-500"
              aria-label={`Quitar ${it.name || "alimento"}`}
            >
              ✕
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              value={it.grams}
              onChange={(e) => setGrams(i, Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-slate-400">g · {it.kcal} kcal</span>
            {calc.has(i) ? (
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400">
                <Spinner /> calculando…
              </span>
            ) : needsCalc(it) ? (
              <button
                onClick={() => recalc(i)}
                className="ml-auto rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700"
              >
                Calcular macros
              </button>
            ) : (
              it.confidence < 0.6 && <span className="ml-auto text-xs text-amber-600">Baja certeza</span>
            )}
          </div>
        </div>
      ))}

      <button
        onClick={addItem}
        className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-sm text-slate-500"
      >
        + Agregar alimento
      </button>

      <Button className="w-full" onClick={confirm} disabled={busy}>
        {finalizing ? "Calculando…" : isSaving ? "Guardando…" : "Confirmar y registrar"}
      </Button>

      {onBack && (
        <button className="w-full text-center text-sm text-slate-400" onClick={onBack}>
          {backLabel ?? "Volver"}
        </button>
      )}
    </div>
  );
}
