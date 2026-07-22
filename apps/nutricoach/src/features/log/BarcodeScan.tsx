import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, PageHeader, Input, FormField, Spinner } from "@titoapps/ui";
import { scaleMacros } from "@titoapps/nutrition";
import { useAuth } from "@/features/auth/AuthProvider";
import { fetchProductByBarcode } from "@/lib/openfoodfacts";
import { findFoodByBarcode, createFood, type NewFood } from "./foodsApi";
import { useAddFood } from "./useLog";
import { mealByHour } from "./helpers";

type BD = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type BDWin = Window & { BarcodeDetector?: new (o?: unknown) => BD };

/**
 * Escaneo de código de barras. Usa la API nativa BarcodeDetector cuando está
 * disponible; si no, entrada manual. Consulta Open Food Facts (gratis, sin claves),
 * cachea el resultado en `foods` y registra por gramos consumidos.
 */
export function BarcodeScan() {
  const nav = useNavigate();
  const { session } = useAuth();
  const add = useAddFood();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [supported] = useState(() => "BarcodeDetector" in window);
  const [manual, setManual] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [food, setFood] = useState<NewFood | null>(null);
  const [grams, setGrams] = useState(100);

  useEffect(() => {
    if (!supported || food) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    const detector = new (window as BDWin).BarcodeDetector!({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
    });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const tick = async () => {
          if (!videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) {
              lookup(codes[0].rawValue);
              return;
            }
          } catch {
            /* frame sin código */
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setError("No se pudo abrir la cámara. Ingresá el código a mano.");
      }
    })();
    return () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, food]);

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
          {supported && (
            <div className="overflow-hidden rounded-2xl bg-black">
              <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline />
            </div>
          )}
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
            <Input type="number" value={grams} onChange={(e) => setGrams(Number(e.target.value))} />
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
