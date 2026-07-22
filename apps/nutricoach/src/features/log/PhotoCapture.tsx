import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, Spinner } from "@titoapps/ui";
import { ai } from "@/lib/ai/client";
import type { DetectedFoodItem } from "@/lib/ai/contracts";
import { useAddFood } from "./useLog";
import { mealByHour } from "./helpers";
import { compressImage } from "@/lib/image";
import { MealItemsEditor } from "./MealItemsEditor";

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
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar la foto.");
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
        <div className="mt-4">
          <MealItemsEditor initialItems={items} isSaving={add.isPending} onConfirm={confirm} />
        </div>
      )}
    </div>
  );
}
