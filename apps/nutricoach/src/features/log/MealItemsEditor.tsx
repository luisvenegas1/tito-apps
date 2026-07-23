import { useState } from "react";
import { Button, Input, Spinner } from "@titoapps/ui";
import { scaleMacros } from "@titoapps/nutrition";
import type { DetectedFoodItem } from "@/lib/ai/contracts";
import { estimateMacros } from "./estimate";
import { useDashboard } from "@/features/dashboard/useDashboard";
import { RowProductPicker, type PickedProduct } from "./RowProductPicker";

/** Macros por gramo — línea base estable para escalar sin volver a llamar a la IA. */
type Per = { kcal: number; protein_g: number; carb_g: number; fat_g: number; fiber_g?: number; sugar_g?: number; sodium_mg?: number };
type EditItem = DetectedFoodItem & { _dirty?: boolean; _per?: Per };

const EMPTY: EditItem = {
  name: "",
  grams: 100,
  kcal: 0,
  protein_g: 0,
  carb_g: 0,
  fat_g: 0,
  confidence: 1,
  _dirty: true,
};

/** Deriva los macros por gramo de un ítem ya estimado (grams>0 y kcal>0). */
function perGram(it: EditItem): Per | undefined {
  if (!(it.grams > 0) || !(it.kcal > 0)) return undefined;
  const g = it.grams;
  return {
    kcal: it.kcal / g,
    protein_g: it.protein_g / g,
    carb_g: it.carb_g / g,
    fat_g: it.fat_g / g,
    fiber_g: it.fiber_g != null ? it.fiber_g / g : undefined,
    sugar_g: it.sugar_g != null ? it.sugar_g / g : undefined,
    sodium_mg: it.sodium_mg != null ? it.sodium_mg / g : undefined,
  };
}

/** Guarda/actualiza la línea base por gramo del ítem. */
function withPer(it: EditItem): EditItem {
  return { ...it, _per: perGram(it) ?? it._per };
}

interface Props {
  initialItems: DetectedFoodItem[];
  isSaving: boolean;
  onConfirm: (items: DetectedFoodItem[]) => void;
  onBack?: () => void;
  backLabel?: string;
}

/**
 * Editor de la lista de alimentos detectados (foto o texto).
 * - Quitar un ítem se puede **deshacer** (por si tocás la ✕ sin querer).
 * - Al renombrar o agregar un alimento, se marca para **recalcular** sus macros
 *   con la IA — nunca se guarda una comida en 0 kcal.
 */
export function MealItemsEditor({ initialItems, isSaving, onConfirm, onBack, backLabel }: Props) {
  const [list, setList] = useState<EditItem[]>(
    initialItems.length ? initialItems.map((it) => withPer({ ...it })) : [{ ...EMPTY }],
  );
  const [removed, setRemoved] = useState<{ index: number; item: EditItem } | null>(null);
  const [calc, setCalc] = useState<Set<number>>(new Set());
  const [finalizing, setFinalizing] = useState(false);
  // Texto en curso del campo de gramos (permite dejarlo vacío sin forzar un 0).
  const [gramsText, setGramsText] = useState<Record<number, string>>({});
  // Fila para la que está abierto el selector de "valores exactos".
  const [pickerRow, setPickerRow] = useState<number | null>(null);
  const { data: dashboard } = useDashboard();

  // Reemplaza los macros de una fila con los valores exactos de un producto (por 100 g).
  const applyProduct = (i: number, p: PickedProduct) => {
    setList((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it;
        const g = it.grams > 0 ? it.grams : 100;
        const m = scaleMacros(p, g);
        return withPer({
          ...it,
          name: p.name,
          grams: g,
          kcal: m.kcal,
          protein_g: m.protein_g,
          carb_g: m.carb_g,
          fat_g: m.fat_g,
          fiber_g: m.fiber_g ?? null,
          sugar_g: m.sugar_g ?? null,
          sodium_mg: m.sodium_mg ?? null,
          confidence: 1,
          _dirty: false,
        });
      }),
    );
    setPickerRow(null);
  };

  const needsCalc = (it: EditItem) => !!it.name.trim() && (it.kcal === 0 || !!it._dirty);

  // Cambiar el NOMBRE invalida la línea base (es otro alimento) → recalcular con IA.
  const setName = (i: number, name: string) =>
    setList((prev) => prev.map((it, idx) => (idx === i ? { ...it, name, _per: undefined, _dirty: true } : it)));

  // Cambiar los GRAMOS escala proporcionalmente desde la línea base — sin llamar a la IA.
  const setGrams = (i: number, grams: number) =>
    setList((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it;
        const per = it._per;
        if (per && grams > 0) {
          return {
            ...it,
            grams,
            kcal: Math.round(per.kcal * grams),
            protein_g: +(per.protein_g * grams).toFixed(1),
            carb_g: +(per.carb_g * grams).toFixed(1),
            fat_g: +(per.fat_g * grams).toFixed(1),
            fiber_g: per.fiber_g != null ? +(per.fiber_g * grams).toFixed(1) : it.fiber_g,
            sugar_g: per.sugar_g != null ? +(per.sugar_g * grams).toFixed(1) : it.sugar_g,
            sodium_mg: per.sodium_mg != null ? Math.round(per.sodium_mg * grams) : it.sodium_mg,
            _dirty: false,
          };
        }
        // Sin línea base todavía (alimento nuevo o sin estimar): marcá para IA.
        return { ...it, grams, _dirty: true };
      }),
    );

  // Escribir en el campo de gramos: dejamos el texto tal cual; solo recalculamos
  // cuando hay un número válido > 0 (así borrar no fuerza un 0 ni borra las kcal).
  const onGramsChange = (i: number, raw: string) => {
    setGramsText((prev) => ({ ...prev, [i]: raw }));
    const n = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(n) && n > 0) setGrams(i, n);
  };
  const onGramsBlur = (i: number) =>
    setGramsText((prev) => {
      const c = { ...prev };
      delete c[i]; // vuelve a mostrar el valor real del ítem
      return c;
    });

  const remove = (i: number) => {
    setGramsText({});
    setList((prev) => {
      setRemoved({ index: i, item: prev[i] });
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const undo = () => {
    if (!removed) return;
    setGramsText({});
    setList((prev) => {
      const copy = [...prev];
      copy.splice(Math.min(removed.index, copy.length), 0, removed.item);
      return copy;
    });
    setRemoved(null);
  };

  const addItem = () => {
    setRemoved(null);
    setGramsText({});
    setList((prev) => [...prev, { ...EMPTY }]);
  };

  const recalc = async (i: number) => {
    const it = list[i];
    if (!it.name.trim() || it.grams <= 0) return;
    setCalc((prev) => new Set(prev).add(i));
    try {
      const m = await estimateMacros(it.name, it.grams);
      setList((prev) => prev.map((x, idx) => (idx === i ? withPer({ ...x, ...m, _dirty: false }) : x)));
    } finally {
      setCalc((prev) => {
        const n = new Set(prev);
        n.delete(i);
        return n;
      });
    }
  };

  const confirm = async () => {
    setFinalizing(true);
    try {
      // Auto-recalcula cualquier fila con nombre pero macros en 0 o modificada.
      const next = [...list];
      for (let i = 0; i < next.length; i++) {
        const it = next[i];
        if (!it.name.trim() || it.grams <= 0) continue;
        if (it.kcal === 0 || it._dirty) {
          const m = await estimateMacros(it.name, it.grams);
          next[i] = withPer({ ...it, ...m, _dirty: false });
        }
      }
      onConfirm(next.filter((it) => it.name.trim() && it.grams > 0));
    } finally {
      setFinalizing(false);
    }
  };

  const busy = isSaving || finalizing;

  // Total de esta comida y cuánto te quedaría del día si la registrás.
  const mealTotalKcal = Math.round(list.reduce((s, it) => s + (it.kcal || 0), 0));
  const remainingKcal = dashboard?.remaining?.kcal ?? null;
  const afterKcal = remainingKcal != null ? Math.round(remainingKcal - mealTotalKcal) : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Revisá, corregí o quitá lo que haga falta:</p>

      {removed && (
        <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>Quitaste "{removed.item.name || "alimento"}".</span>
          <button onClick={undo} className="font-semibold underline">
            Deshacer
          </button>
        </div>
      )}

      {list.map((it, i) => (
        <div key={i} className="card">
          <div className="flex items-center gap-2">
            <Input
              value={it.name}
              onChange={(e) => setName(i, e.target.value)}
              placeholder="Nombre del alimento"
              className="flex-1"
            />
            <button
              onClick={() => remove(i)}
              className="text-slate-400 hover:text-red-500"
              aria-label={`Quitar ${it.name || "alimento"}`}
            >
              ✕
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              value={gramsText[i] ?? String(it.grams)}
              onChange={(e) => onGramsChange(i, e.target.value)}
              onBlur={() => onGramsBlur(i)}
              className="w-24"
            />
            <span className="text-sm text-slate-400">g · {it.kcal} kcal</span>
            <button
              onClick={() => setPickerRow(i)}
              className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 active:scale-95"
              aria-label="Usar valores exactos de un producto guardado o código de barras"
            >
              🔎 exacto
            </button>
            {calc.has(i) ? (
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400">
                <Spinner /> calculando…
              </span>
            ) : needsCalc(it) ? (
              <button
                onClick={() => recalc(i)}
                className="ml-auto rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700"
              >
                Calcular macros
              </button>
            ) : (
              it.confidence < 0.6 && <span className="ml-auto text-xs text-amber-600">Baja certeza</span>
            )}
          </div>
        </div>
      ))}

      <button
        onClick={addItem}
        className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-sm text-slate-500"
      >
        + Agregar alimento
      </button>

      {/* Total de la comida y cómo queda tu día */}
      <div className="card space-y-1 bg-slate-50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Total de esta comida</span>
          <span className="font-bold text-slate-900">{mealTotalKcal} kcal</span>
        </div>
        {remainingKcal != null && afterKcal != null && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Te quedan hoy</span>
              <span className="text-slate-700">{Math.round(remainingKcal)} kcal</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Si la registrás, te quedarían</span>
              <span className={afterKcal >= 0 ? "font-semibold text-green-700" : "font-semibold text-red-600"}>
                {afterKcal} kcal
              </span>
            </div>
            {afterKcal < 0 && (
              <p className="text-xs text-amber-600">Te pasarías {Math.abs(afterKcal)} kcal de tu meta de hoy.</p>
            )}
          </>
        )}
      </div>

      <Button className="w-full" onClick={confirm} disabled={busy}>
        {finalizing ? "Calculando…" : isSaving ? "Guardando…" : "Confirmar y registrar"}
      </Button>

      {onBack && (
        <button className="w-full text-center text-sm text-slate-400" onClick={onBack}>
          {backLabel ?? "Volver"}
        </button>
      )}

      {pickerRow != null && (
        <RowProductPicker onClose={() => setPickerRow(null)} onApply={(p) => applyProduct(pickerRow, p)} />
      )}
    </div>
  );
}
