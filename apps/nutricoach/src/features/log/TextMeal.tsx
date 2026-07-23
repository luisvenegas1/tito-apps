import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, PageHeader, Spinner } from "@titoapps/ui";
import { scaleMacros } from "@titoapps/nutrition";
import { ai } from "@/lib/ai/client";
import type { DetectedFoodItem } from "@/lib/ai/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Food } from "@/lib/supabase/types";
import { useAddFood } from "./useLog";
import { listMyFoods } from "./foodsApi";
import { mealByHour } from "./helpers";
import { MealItemsEditor } from "./MealItemsEditor";

const EXAMPLE = "2 huevos, una tajada de jamón de pavo y una tortilla con queso";

/** Normaliza nombres para comparar sin acentos ni mayúsculas. */
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/** Reemplaza los macros estimados por los EXACTOS del producto guardado que coincida. */
function applyMyProducts(items: DetectedFoodItem[], products: Food[]): DetectedFoodItem[] {
  if (products.length === 0) return items;
  return items.map((it) => {
    const p = products.find((pr) => norm(pr.name) === norm(it.name));
    if (!p) return it;
    const grams = it.grams > 0 ? it.grams : p.serving_g ?? 100;
    const m = scaleMacros(p, grams);
    return {
      ...it,
      name: p.name,
      grams,
      kcal: m.kcal,
      protein_g: m.protein_g,
      carb_g: m.carb_g,
      fat_g: m.fat_g,
      fiber_g: m.fiber_g ?? null,
      sugar_g: m.sugar_g ?? null,
      sodium_mg: m.sodium_mg ?? null,
      confidence: 1,
    };
  });
}

/**
 * Registro semiautomático: el usuario describe la comida en lenguaje natural y
 * la IA estima cantidades y macros. Corrección con el editor compartido.
 */
export function TextMeal() {
  const nav = useNavigate();
  const { session } = useAuth();
  const userId = session?.user.id;
  const add = useAddFood();
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [items, setItems] = useState<DetectedFoodItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Productos guardados del usuario ("Mis productos"): la IA los reconoce por
  // nombre y usamos sus valores exactos en lugar de estimar.
  const { data: myFoods = [] } = useQuery({
    queryKey: ["myFoods"],
    queryFn: () => listMyFoods(userId!),
    enabled: !!userId,
  });

  const analyze = async () => {
    if (!text.trim()) return;
    setError(null);
    setAnalyzing(true);
    try {
      const res = await ai.parseMealText({ text: text.trim(), knownProducts: myFoods.map((f) => f.name) });
      setItems(applyMyProducts(res.items, myFoods));
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
