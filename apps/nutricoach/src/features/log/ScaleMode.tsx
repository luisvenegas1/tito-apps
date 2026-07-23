import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, PageHeader, Spinner, Input, FormField } from "@titoapps/ui";
import { NumberInput } from "@/components/ui/NumberInput";
import { scaleMacros, type Per100g } from "@titoapps/nutrition";
import { ai } from "@/lib/ai/client";
import { useAddFood } from "./useLog";
import { mealByHour } from "./helpers";
import { compressImage } from "@/lib/image";

/**
 * Modo balanza: foto del alimento sobre una balanza. La IA identifica alimento
 * + peso; el usuario puede corregir el peso. Los macros se calculan localmente
 * con @titoapps/nutrition escalando los valores por 100 g.
 */
export function ScaleMode() {
  const nav = useNavigate();
  const add = useAddFood();
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [grams, setGrams] = useState<number>(0);
  const [per100g, setPer100g] = useState<Per100g | null>(null);
  const [lowConfidence, setLowConfidence] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setAnalyzing(true);
    try {
      const imageBase64 = await compressImage(file);
      const res = await ai.analyzeScale({ imageBase64 });
      setName(res.food.name);
      setPer100g(res.per100g);
      setGrams(res.grams ?? 0);
      setLowConfidence(res.grams == null || res.gramsConfidence < 0.6);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar.");
    } finally {
      setAnalyzing(false);
    }
  };

  const macros = per100g && grams > 0 ? scaleMacros(per100g, grams) : null;

  const confirm = () => {
    if (!per100g || !macros || grams <= 0) return;
    add.mutate(
      [
        {
          name: name || "Alimento",
          grams,
          meal: mealByHour(),
          kcal: macros.kcal,
          protein_g: macros.protein_g,
          carb_g: macros.carb_g,
          fat_g: macros.fat_g,
          fiber_g: macros.fiber_g ?? null,
          sugar_g: macros.sugar_g ?? null,
          sodium_mg: macros.sodium_mg ?? null,
          source: "scale" as const,
        },
      ],
      { onSuccess: () => nav("/") },
    );
  };

  return (
    <div className="p-4">
      <PageHeader title="Modo balanza" subtitle="Foto del alimento sobre la balanza" />

      {!per100g && (
        <label className="card mt-4 flex cursor-pointer flex-col items-center gap-2 py-10 text-center">
          <span className="text-4xl">⚖️</span>
          <span className="font-medium text-slate-700">Foto sobre la balanza</span>
          <span className="text-xs text-slate-400">La IA identifica el alimento y lee el peso</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        </label>
      )}

      {analyzing && (
        <div className="mt-6 flex items-center justify-center gap-2 text-slate-500">
          <Spinner /> Analizando…
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {per100g && (
        <div className="mt-4 space-y-3">
          <FormField label="Alimento">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label={lowConfidence ? "Peso (no se detectó bien, corregilo)" : "Peso (g)"}>
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
