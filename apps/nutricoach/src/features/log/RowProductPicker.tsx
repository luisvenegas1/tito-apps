import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

  const foods = useQuery({
    queryKey: ["myFoods"],
    queryFn: () => listMyFoods(userId!),
    enabled: !!userId,
  });

  const list = (foods.data ?? []).filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase()));

  const lookupCode = async () => {
    const bc = code.trim();
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
          <p className="mb-1 text-xs text-slate-500">…o buscá por código de barras</p>
          <div className="flex gap-2">
            <Input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="7501…" className="flex-1" />
            <Button onClick={lookupCode} disabled={!code.trim() || loading}>
              {loading ? "…" : "Buscar"}
            </Button>
          </div>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
