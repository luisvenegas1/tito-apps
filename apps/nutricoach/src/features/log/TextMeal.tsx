import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, PageHeader, Spinner } from "@titoapps/ui";
import { ai } from "@/lib/ai/client";
import type { DetectedFoodItem } from "@/lib/ai/contracts";
import { useAddFood } from "./useLog";
import { mealByHour } from "./helpers";
import { MealItemsEditor } from "./MealItemsEditor";

const EXAMPLE = "2 huevos, una tajada de jamón de pavo y una tortilla con queso";

/**
 * Registro semiautomático: el usuario describe la comida en lenguaje natural y
 * la IA estima cantidades y macros. Corrección con el editor compartido.
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
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo interpretar la comida.");
    } finally {
      setAnalyzing(false);
    }
  };

  const confirm = (final: DetectedFoodItem[]) => {
    const meal = mealByHour();
    add.mutate(
      final.map((it) => ({
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
          <button type="button" onClick={() => setText(EXAMPLE)} className="text-left text-xs text-slate-400 underline">
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
        <div className="mt-4">
          <MealItemsEditor
            initialItems={items}
            isSaving={add.isPending}
            onConfirm={confirm}
            onBack={() => setItems(null)}
            backLabel="Volver a escribir"
          />
        </div>
      )}
    </div>
  );
}
