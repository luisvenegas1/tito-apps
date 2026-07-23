import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button, PageHeader, Input, FormField, Spinner } from "@titoapps/ui";
import { NumberInput } from "@/components/ui/NumberInput";
import { scaleMacros } from "@titoapps/nutrition";
import { useAuth } from "@/features/auth/AuthProvider";
import { fetchProductByBarcode } from "@/lib/openfoodfacts";
import { findFoodByBarcode, createFood, type NewFood } from "./foodsApi";
import { useAddFood } from "./useLog";
import { mealByHour } from "./helpers";

/**
 * Escaneo de código de barras EN VIVO con la cámara (ZXing): funciona en iOS,
 * Android y desktop. Apenas lee el código consulta Open Food Facts, cachea en
 * `foods` y registra por gramos. Entrada manual como respaldo.
 */
export function BarcodeScan() {
  const nav = useNavigate();
  const { session } = useAuth();
  const add = useAddFood();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [manual, setManual] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [food, setFood] = useState<NewFood | null>(null);
  const [grams, setGrams] = useState(100);

  useEffect(() => {
    if (food || !videoRef.current) return;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current, (result) => {
        if (result && !cancelled) {
          cancelled = true;
          controlsRef.current?.stop();
          lookup(result.getText());
        }
      })
      .then((controls) => {
        controlsRef.current = controls;
        if (cancelled) controls.stop();
      })
      .catch(() => setError("No pudimos abrir la cámara. Permití el acceso o ingresá el código a mano."));
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [food]);

  const lookup = async (barcode: string) => {
    setError(null);
    setLoading(true);
    try {
      const cached = await findFoodByBarcode(session!.user.id, barcode);
      if (cached) {
        setFood({ ...cached, source: "barcode" });
        setGrams(cached.serving_g ?? 100);
        return;
      }
      const off = await fetchProductByBarcode(barcode);
      if (!off) {
        setError(`No encontramos el código ${barcode}. Probá con "Personalizado".`);
        return;
      }
      setFood(off);
      setGrams(off.serving_g ?? 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al consultar el producto.");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!food) return;
    // Cachear en foods si es nuevo (tiene barcode y aún no existía).
    let foodId: string | null = null;
    try {
      const existing = food.barcode ? await findFoodByBarcode(session!.user.id, food.barcode) : null;
      foodId = existing ? existing.id : (await createFood(session!.user.id, food)).id;
    } catch {
      foodId = null; // si falla el cache, registramos igual con snapshot
    }
    const m = scaleMacros(food, grams);
    add.mutate(
      [
        {
          food_id: foodId,
          name: food.name,
          grams,
          meal: mealByHour(),
          kcal: m.kcal,
          protein_g: m.protein_g,
          carb_g: m.carb_g,
          fat_g: m.fat_g,
          fiber_g: m.fiber_g ?? null,
          sugar_g: m.sugar_g ?? null,
          sodium_mg: m.sodium_mg ?? null,
          source: "barcode" as const,
        },
      ],
      { onSuccess: () => nav("/") },
    );
  };

  return (
    <div className="p-4">
      <PageHeader title="Código de barras" subtitle="Escaneá o ingresá el código" />

      {!food && (
        <div className="mt-4 space-y-3">
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} className="h-60 w-full object-cover" muted playsInline autoPlay />
            {/* Guía visual de escaneo */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-56 rounded-lg border-2 border-white/80" />
            </div>
            <p className="absolute inset-x-0 bottom-2 text-center text-xs text-white/90">
              Apuntá al código de barras
            </p>
          </div>
          <FormField label="…o ingresá el código a mano">
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="7501..."
                className="flex-1"
              />
              <Button onClick={() => lookup(manual.trim())} disabled={!manual.trim() || loading}>
                Buscar
              </Button>
            </div>
          </FormField>
          {loading && (
            <div className="flex items-center gap-2 text-slate-500">
              <Spinner /> Consultando…
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {food && (
        <div className="mt-4 space-y-3">
          <div className="card">
            <div className="font-medium text-slate-800">{food.name}</div>
            {food.brand && <div className="text-xs text-slate-400">{food.brand}</div>}
            <div className="mt-1 text-xs text-slate-400">{food.kcal} kcal/100g</div>
          </div>
          <FormField label="Cantidad consumida (g)">
            <NumberInput value={grams} onValueChange={setGrams} />
          </FormField>
          <div className="card text-sm text-slate-600">
            {scaleMacros(food, grams).kcal} kcal · P{scaleMacros(food, grams).protein_g} · C
            {scaleMacros(food, grams).carb_g} · G{scaleMacros(food, grams).fat_g}
          </div>
          <Button className="w-full" onClick={confirm} disabled={add.isPending || grams <= 0}>
            {add.isPending ? "Guardando…" : "Registrar"}
          </Button>
          <button className="w-full text-center text-sm text-slate-400" onClick={() => setFood(null)}>
            Escanear otro
          </button>
        </div>
      )}
    </div>
  );
}
