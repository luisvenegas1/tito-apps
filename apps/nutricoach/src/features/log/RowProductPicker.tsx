import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button, Input, Spinner } from "@titoapps/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { fetchProductByBarcode } from "@/lib/openfoodfacts";
import { listMyFoods, findFoodByBarcode } from "./foodsApi";

/** Valores por 100 g + nombre de un producto elegido para reemplazar un ítem. */
export interface PickedProduct {
  name: string;
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
}

interface Props {
  onClose: () => void;
  onApply: (p: PickedProduct) => void;
}

/**
 * Selector para reemplazar los macros de UN alimento del editor con valores
 * exactos: desde "Mis productos" guardados, o buscando un código de barras.
 */
export function RowProductPicker({ onClose, onApply }: Props) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [q, setQ] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const foods = useQuery({
    queryKey: ["myFoods"],
    queryFn: () => listMyFoods(userId!),
    enabled: !!userId,
  });

  // Escaneo en vivo con la cámara (ZXing): al leer el código, lo busca solo.
  useEffect(() => {
    if (!scanning || !videoRef.current) return;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current, (result) => {
        if (result && !cancelled) {
          cancelled = true;
          controlsRef.current?.stop();
          setScanning(false);
          lookupCode(result.getText());
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
  }, [scanning]);

  const list = (foods.data ?? []).filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase()));

  const lookupCode = async (barcode?: string) => {
    const bc = (barcode ?? code).trim();
    if (!bc) return;
    setError(null);
    setLoading(true);
    try {
      const cached = await findFoodByBarcode(userId!, bc);
      const off = cached ?? (await fetchProductByBarcode(bc));
      if (!off) {
        setError(`No encontramos el código ${bc}.`);
        return;
      }
      onApply(off as PickedProduct);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al consultar el producto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-2xl">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Usar valores exactos</h3>
          <button onClick={onClose} className="text-slate-400" aria-label="Cerrar">✕</button>
        </div>

        <Input placeholder="Buscar en Mis productos…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />

        <div className="mt-2 max-h-52 overflow-y-auto">
          {foods.isLoading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : list.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-400">No hay productos guardados que coincidan.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {list.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => onApply(f as PickedProduct)}
                    className="flex w-full items-center justify-between py-2 text-left active:opacity-70"
                  >
                    <span className="text-sm font-medium text-slate-700">{f.name}</span>
                    <span className="text-xs text-slate-400">{f.kcal} kcal/100g</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-1 text-xs text-slate-500">…o por código de barras</p>

          {scanning ? (
            <div className="space-y-2">
              <div className="relative overflow-hidden rounded-xl bg-black">
                <video ref={videoRef} className="h-44 w-full object-cover" muted playsInline autoPlay />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-16 w-44 rounded-lg border-2 border-white/80" />
                </div>
              </div>
              <button onClick={() => setScanning(false)} className="w-full text-center text-sm text-slate-400">
                Cancelar escaneo
              </button>
            </div>
          ) : (
            <>
              <Button variant="secondary" className="w-full" onClick={() => { setError(null); setScanning(true); }}>
                📷 Escanear con la cámara
              </Button>
              <div className="mt-2 flex gap-2">
                <Input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="…o escribí el código 7501…" className="flex-1" />
                <Button onClick={() => lookupCode()} disabled={!code.trim() || loading}>
                  {loading ? "…" : "Buscar"}
                </Button>
              </div>
            </>
          )}
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
