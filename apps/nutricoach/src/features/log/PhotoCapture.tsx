import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, PageHeader, Spinner, Input } from "@titoapps/ui";
import { ai } from "@/lib/ai/client";
import type { DetectedFoodItem } from "@/lib/ai/contracts";
import { useAddFood } from "./useLog";
import { mealByHour } from "./helpers";
import { compressImage } from "@/lib/image";

const EMPTY_ITEM: DetectedFoodItem = {
  name: "",
  grams: 100,
  kcal: 0,
  protein_g: 0,
  carb_g: 0,
  fat_g: 0,
  confidence: 1,
};

/** Registro por foto: la IA detecta alimentos y estima cantidades (todo editable). */
export function PhotoCapture() {
  const nav = useNavigate();
  const add = useAddFood();
  const [analyzing, setAnalyzing] = useState(false);
  const [items, setItems] = useState<DetectedFoodItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setAnalyzing(true);
    try {
      const imageBase64 = await compressImage(file);
      const res = await ai.analyzeFood({ imageBase64 });
      setItems(res.items.length ? res.items : [{ ...EMPTY_ITEM }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar la foto.");
    } finally {
      setAnalyzing(false);
    }
  };

  const update = (i: number, next: DetectedFoodItem) =>
    setItems((prev) => (prev ? prev.map((it, idx) => (idx === i ? next : it)) : prev));

  const editGrams = (i: number, grams: number) => {
    setItems((prev) => {
      if (!prev) return prev;
      const it = prev[i];
      const factor = grams / (it.grams || 1);
      return prev.map((x, idx) =>
        idx === i
          ? {
              ...it,
              grams,
              kcal: Math.round(it.kcal * factor),
              protein_g: +(it.protein_g * factor).toFixed(1),
              carb_g: +(it.carb_g * factor).toFixed(1),
              fat_g: +(it.fat_g * factor).toFixed(1),
            }
          : x,
      );
    });
  };

  const removeItem = (i: number) =>
    setItems((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev));
  const addItem = () => setItems((prev) => [...(prev ?? []), { ...EMPTY_ITEM }]);

  const confirm = () => {
    if (!items) return;
    const meal = mealByHour();
    add.mutate(
      items
        .filter((it) => it.name.trim() && it.grams > 0)
        .map((it) => ({
          name: it.name,
          grams: it.grams,
          meal,
          kcal: it.kcal,
          protein_g: it.protein_g,
          carb_g: it.carb_g,
          fat_g: it.fat_g,
          fiber_g: it.fiber_g ?? null,
          sugar_g: it.sugar_g ?? null,
          sodium_mg: it.sodium_mg ?? null,
          source: "photo" as const,
          confidence: it.confidence ?? null,
        })),
      { onSuccess: () => nav("/") },
    );
  };

  return (
    <div className="p-4">
      <PageHeader title="Registrar por foto" subtitle="La IA hace el trabajo" />

      {!items && (
        <label className="card mt-4 flex cursor-pointer flex-col items-center gap-2 py-10 text-center">
          <span className="text-4xl">📷</span>
          <span className="font-medium text-slate-700">Tomar o subir foto</span>
          <span className="text-xs text-slate-400">La IA detecta los alimentos y estima cantidades</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        </label>
      )}

      {analyzing && (
        <div className="mt-6 flex items-center justify-center gap-2 text-slate-500">
          <Spinner /> Analizando…
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {items && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-500">Revisá, corregí o quitá lo que haga falta:</p>
          {items.map((it, i) => (
            <div key={i} className="card">
              <div className="flex items-center gap-2">
                <Input
                  value={it.name}
                  onChange={(e) => update(i, { ...it, name: e.target.value })}
                  placeholder="Nombre del alimento"
                  className="flex-1"
                />
                <button
                  onClick={() => removeItem(i)}
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
                  onChange={(e) => editGrams(i, Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-slate-400">g · {it.kcal} kcal</span>
                {it.confidence < 0.6 && <span className="ml-auto text-xs text-amber-600">Baja certeza</span>}
              </div>
            </div>
          ))}
          <button onClick={addItem} className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-sm text-slate-500">
            + Agregar alimento
          </button>
          <Button className="w-full" onClick={confirm} disabled={add.isPending}>
            {add.isPending ? "Guardando…" : "Confirmar y registrar"}
          </Button>
        </div>
      )}
    </div>
  );
}
