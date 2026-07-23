import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, PageHeader, Spinner, Input, FormField } from "@titoapps/ui";
import { NumberInput } from "@/components/ui/NumberInput";
import { scaleMacros, type Per100g } from "@titoapps/nutrition";
import { ai } from "@/lib/ai/client";
import { compressImage } from "@/lib/image";
import { useAddFood } from "./useLog";
import { mealByHour } from "./helpers";

/**
 * Foto de la tabla nutricional del empaque → la IA extrae valores por 100 g;
 * el usuario indica los gramos consumidos y NutriCoach calcula los macros.
 */
export function LabelScan() {
  const nav = useNavigate();
  const add = useAddFood();
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [per100g, setPer100g] = useState<Per100g | null>(null);
  const [grams, setGrams] = useState(100);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setAnalyzing(true);
    try {
      const imageBase64 = await compressImage(file);
      const res = await ai.analyzeLabel({ imageBase64 });
      setPer100g(res.per100g);
      if (res.servingSize_g) setGrams(res.servingSize_g);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer la etiqueta.");
    } finally {
      setAnalyzing(false);
    }
  };

  const macros = per100g && grams > 0 ? scaleMacros(per100g, grams) : null;

  const confirm = () => {
    if (!per100g || !macros) return;
    add.mutate(
      [
        {
          name: name || "Producto (etiqueta)",
          grams,
          meal: mealByHour(),
          kcal: macros.kcal,
          protein_g: macros.protein_g,
          carb_g: macros.carb_g,
          fat_g: macros.fat_g,
          fiber_g: macros.fiber_g ?? null,
          sugar_g: macros.sugar_g ?? null,
          sodium_mg: macros.sodium_mg ?? null,
          source: "label" as const,
        },
      ],
      { onSuccess: () => nav("/") },
    );
  };

  return (
    <div className="p-4">
      <PageHeader title="Tabla nutricional" subtitle="Foto de la etiqueta del producto" />

      {!per100g && (
        <label className="card mt-4 flex cursor-pointer flex-col items-center gap-2 py-10 text-center">
          <span className="text-4xl">🏷️</span>
          <span className="font-medium text-slate-700">Foto de la tabla nutricional</span>
          <span className="text-xs text-slate-400">La IA lee los valores por 100 g</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        </label>
      )}

      {analyzing && (
        <div className="mt-6 flex items-center justify-center gap-2 text-slate-500">
          <Spinner /> Leyendo etiqueta…
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {per100g && (
        <div className="mt-4 space-y-3">
          <FormField label="Nombre del producto">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Galletas de avena" />
          </FormField>
          <FormField label="Cantidad consumida (g)">
            <NumberInput value={grams} onValueChange={setGrams} />
          </FormField>
          {macros && (
            <div className="card text-sm text-slate-600">
              {macros.kcal} kcal · P{macros.protein_g} · C{macros.carb_g} · G{macros.fat_g}
            </div>
          )}
          <Button className="w-full" onClick={confirm} disabled={add.isPending || grams <= 0}>
            {add.isPending ? "Guardando…" : "Confirmar y registrar"}
          </Button>
        </div>
      )}
    </div>
  );
}
