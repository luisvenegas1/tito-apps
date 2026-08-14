import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { PageHeader, Button, Input, FormField, Spinner } from "@titoapps/ui";
import { NumberInput } from "@/components/ui/NumberInput";
import { ai } from "@/lib/ai/client";
import { compressImage } from "@/lib/image";
import { scaleMacros } from "@titoapps/nutrition";
import { fetchProductByBarcode } from "@/lib/openfoodfacts";
import { useAuth } from "@/features/auth/AuthProvider";
import { findFoodByBarcode } from "@/features/log/foodsApi";
import { useLogDate } from "@/features/log/useLog";
import { usePlanCategories } from "./usePro";
import { ExchangeConfirm, type DetectedMacros } from "./ExchangeConfirm";

type Method = "photo" | "text" | "barcode" | "label";
const TITLES: Record<Method, { title: string; subtitle: string }> = {
  photo: { title: "Analizar comida", subtitle: "La IA detecta y estima intercambios" },
  text: { title: "Describir comida", subtitle: "Escribilo y calculamos los intercambios" },
  barcode: { title: "Escanear producto", subtitle: "Código de barras → intercambios" },
  label: { title: "Etiqueta nutricional", subtitle: "Foto de la tabla → intercambios" },
};

/** Suma los macros absolutos de varios ítems detectados. */
function aggregate(items: Array<{ protein_g?: number; carb_g?: number; fat_g?: number; kcal?: number }>): DetectedMacros {
  return items.reduce<DetectedMacros>(
    (a, it) => ({
      protein_g: (a.protein_g ?? 0) + (it.protein_g ?? 0),
      carb_g: (a.carb_g ?? 0) + (it.carb_g ?? 0),
      fat_g: (a.fat_g ?? 0) + (it.fat_g ?? 0),
      kcal: (a.kcal ?? 0) + (it.kcal ?? 0),
    }),
    {},
  );
}

/**
 * Captura para el modo profesional: reutiliza foto/texto/código/etiqueta y
 * convierte los macros detectados a INTERCAMBIOS según el plan del usuario,
 * mostrando la estimación para confirmar antes de guardar.
 */
export function ProCapturePage() {
  const [params] = useSearchParams();
  const method = ((params.get("method") as Method) || "photo") as Method;
  const date = useLogDate();
  const { session } = useAuth();
  const { data: categories = [] } = usePlanCategories();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<{ macros: DetectedMacros; name: string } | null>(null);

  // Estados propios de texto y de producto por 100 g (barcode/label).
  const [text, setText] = useState("");
  const [manual, setManual] = useState("");
  const [productName, setProductName] = useState("");
  const [productPer100, setProductPer100] = useState<{ kcal: number; protein_g: number; carb_g: number; fat_g: number } | null>(null);
  const [grams, setGrams] = useState(100);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  // Cámara para barcode (ZXing), igual patrón que el modo personal.
  useEffect(() => {
    if (method !== "barcode" || detected || productPer100 || !videoRef.current) return;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current, (result) => {
        if (result && !cancelled) {
          cancelled = true;
          controlsRef.current?.stop();
          void lookupBarcode(result.getText());
        }
      })
      .then((controls) => {
        controlsRef.current = controls;
        if (cancelled) controls.stop();
      })
      .catch(() => setError("No pudimos abrir la cámara. Ingresá el código a mano."));
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, detected, productPer100]);

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const imageBase64 = await compressImage(file);
      if (method === "label") {
        const res = await ai.analyzeLabel({ imageBase64 });
        setProductName("Producto (etiqueta)");
        setProductPer100({ kcal: res.per100g.kcal, protein_g: res.per100g.protein_g, carb_g: res.per100g.carb_g, fat_g: res.per100g.fat_g });
        setGrams(res.servingSize_g ?? 100);
      } else {
        const res = await ai.analyzeFood({ imageBase64 });
        setDetected({ macros: aggregate(res.items), name: res.items[0]?.name ?? "Comida" });
      }
    } catch {
      setError("No pudimos analizar la foto. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const analyzeText = async () => {
    if (!text.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const res = await ai.parseMealText({ text: text.trim() });
      setDetected({ macros: aggregate(res.items), name: res.items.map((i) => i.name).slice(0, 2).join(", ") || "Comida" });
    } catch {
      setError("No pudimos calcular los intercambios en este momento. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const lookupBarcode = async (barcode: string) => {
    setError(null);
    setBusy(true);
    try {
      const cached = session ? await findFoodByBarcode(session.user.id, barcode) : null;
      const off = cached ?? (await fetchProductByBarcode(barcode));
      if (!off) {
        setError(`No encontramos ese producto (código ${barcode}). Registralo como intercambio manual.`);
        return;
      }
      setProductName(off.name);
      setProductPer100({ kcal: off.kcal, protein_g: off.protein_g, carb_g: off.carb_g, fat_g: off.fat_g });
      setGrams(off.serving_g ?? 100);
    } catch {
      setError("No pudimos consultar el producto ahora mismo. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const confirmProduct = () => {
    if (!productPer100) return;
    const m = scaleMacros(productPer100, grams);
    setDetected({ macros: { kcal: m.kcal, protein_g: m.protein_g, carb_g: m.carb_g, fat_g: m.fat_g }, name: productName });
  };

  const meta = TITLES[method];
  const reset = () => {
    setDetected(null);
    setProductPer100(null);
    setManual("");
  };

  return (
    <div className="p-4">
      <PageHeader title={meta.title} subtitle={meta.subtitle} />

      {/* Paso final: confirmar intercambios */}
      {detected ? (
        <div className="mt-4">
          <ExchangeConfirm
            categories={categories}
            date={date}
            macros={detected.macros}
            defaultName={detected.name}
            source={method}
            onDone={() => history.back()}
            onBack={reset}
            backLabel="Volver"
          />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {method === "text" && (
            <>
              <textarea className="input min-h-[96px] resize-none" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej.: 2 huevos, una tortilla y un café" autoFocus />
              <Button className="w-full" onClick={analyzeText} disabled={busy || !text.trim()}>
                {busy ? <span className="inline-flex items-center gap-2"><Spinner /> Calculando…</span> : "Calcular intercambios"}
              </Button>
            </>
          )}

          {(method === "photo" || method === "label") && (
            <label className="card flex cursor-pointer flex-col items-center gap-2 py-10 text-center">
              <span className="text-4xl">{method === "label" ? "🏷️" : "📷"}</span>
              <span className="font-medium text-slate-700">{method === "label" ? "Foto de la tabla nutricional" : "Tomar o subir foto"}</span>
              <span className="text-xs text-slate-400">La IA estima los intercambios según tu plan</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
            </label>
          )}

          {method === "barcode" && !productPer100 && (
            <>
              <div className="relative overflow-hidden rounded-2xl bg-black">
                <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline autoPlay />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-20 w-52 rounded-lg border-2 border-white/80" />
                </div>
              </div>
              <FormField label="…o ingresá el código a mano">
                <div className="flex gap-2">
                  <Input inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="7501..." className="flex-1" />
                  <Button onClick={() => lookupBarcode(manual.trim())} disabled={!manual.trim() || busy}>Buscar</Button>
                </div>
              </FormField>
            </>
          )}

          {/* barcode/label: pedir gramos consumidos y confirmar */}
          {productPer100 && (
            <div className="space-y-3">
              <div className="card">
                <div className="font-medium text-slate-800">{productName}</div>
                <div className="mt-1 text-xs text-slate-400">{productPer100.kcal} kcal/100g · P{productPer100.protein_g} C{productPer100.carb_g} G{productPer100.fat_g}</div>
              </div>
              <FormField label="Cantidad consumida (g)">
                <NumberInput value={grams} onValueChange={setGrams} min={0} />
              </FormField>
              <Button className="w-full" onClick={confirmProduct} disabled={!(grams > 0)}>Estimar intercambios</Button>
              <button className="w-full text-center text-sm text-slate-400" onClick={reset}>Volver</button>
            </div>
          )}

          {busy && method !== "text" && (
            <div className="flex items-center justify-center gap-2 text-slate-500"><Spinner /> Analizando…</div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
