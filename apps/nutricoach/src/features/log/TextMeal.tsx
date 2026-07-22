import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, PageHeader, Spinner, Input } from "@titoapps/ui";
import { ai } from "@/lib/ai/client";
import type { DetectedFoodItem } from "@/lib/ai/contracts";
import { useAddFood } from "./useLog";
import { mealByHour } from "./helpers";

const EXAMPLE = "2 huevos, una tajada de jamón de pavo y una tortilla con queso";

const EMPTY_ITEM: DetectedFoodItem = {
  name: "",
  grams: 100,
  kcal: 0,
  protein_g: 0,
  carb_g: 0,
  fat_g: 0,
  confidence: 1,
};

/**
 * Registro semiautomático: el usuario describe la comida en lenguaje natural y
 * la IA estima cantidades y macros. Misma tarjeta editable que la foto.
 */
export function TextMeal() {
  const nav = useNavigate();
  const add = useAddFood();
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [items, setItems] = useState<DetectedFoodItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (!text.trim()) return;
    setError(null);
    setAnalyzing(true);
    try {
      const res = await ai.parseMealText({ text: text.trim() });
      setItems(res.items.length ? res.items : [{ ...EMPTY_ITEM }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo interpretar la comida.");
    } finally {
      setAnalyzing(false);
    }
  };

  const update = (i: number, nextItem: DetectedFoodItem) =>
    setItems((prev) => (prev ? prev.map((it, idx) => (idx === i ? nextItem : it)) : prev));

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
          source: "custom" as const,
          confidence: it.confidence ?? null,
        })),
      { onSuccess: () => nav("/") },
    );
  };

  return (
    <div className="p-4">
      <PageHeader title="Escribí tu comida" subtitle="La IA calcula las calorías y macros" />

      {!items && (
        <div className="mt-4 space-y-3">
          <textarea
            className="input min-h-[96px] resize-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Ej.: ${EXAMPLE}`}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setText(EXAMPLE)}
            className="text-left text-xs text-slate-400 underline"
          >
            Usar un ejemplo
          </button>
          <Button className="w-full" onClick={analyze} disabled={analyzing || !text.trim()}>
            {analyzing ? (
              <span className="inline-flex items-center gap-2">
                <Spinner /> Calculando…
              </span>
            ) : (
              "Calcular calorías"
            )}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {items && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-500">Revisá y ajustá lo que haga falta:</p>
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
          <button
            onClick={addItem}
            className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-sm text-slate-500"
          >
            + Agregar alimento
          </button>
          <Button className="w-full" onClick={confirm} disabled={add.isPending}>
            {add.isPending ? "Guardando…" : "Confirmar y registrar"}
          </Button>
          <button className="w-full text-center text-sm text-slate-400" onClick={() => setItems(null)}>
            Volver a escribir
          </button>
        </div>
      )}
    </div>
  );
}
