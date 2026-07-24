import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, EmptyState, Button } from "@titoapps/ui";
import { NumberInput } from "@/components/ui/NumberInput";
import { useDailyLog, useRemovableLog, useAddFood, useUpdateFood } from "./useLog";
import { useFrequents } from "./useFrequents";
import type { FrequentEntry } from "./frequents";
import type { LogItem } from "@/lib/supabase/types";

const METHODS = [
  { to: "/log/photo", icon: "📷", title: "Foto", desc: "La IA detecta y calcula" },
  { to: "/log/text", icon: "✍️", title: "Escribir", desc: "Describilo y la IA calcula" },
  { to: "/log/scale", icon: "⚖️", title: "Balanza", desc: "Foto sobre la balanza" },
  { to: "/log/barcode", icon: "📶", title: "Código de barras", desc: "Escaneá el producto" },
  { to: "/log/label", icon: "🏷️", title: "Etiqueta", desc: "Foto de la tabla" },
  { to: "/log/search", icon: "🔍", title: "Buscar", desc: "En tu catálogo" },
  { to: "/log/custom", icon: "✏️", title: "Personalizado", desc: "Crear alimento" },
];

export function LogHub() {
  const { data: items = [] } = useDailyLog();
  const { data: frequents = [] } = useFrequents();
  const { removed, remove, undo, dismiss } = useRemovableLog();
  const add = useAddFood();
  const upd = useUpdateFood();

  // Edición inline de la cantidad de una comida ya registrada.
  const [editId, setEditId] = useState<string | null>(null);
  const [editGrams, setEditGrams] = useState(0);

  const startEdit = (it: LogItem) => {
    setEditId(it.id);
    setEditGrams(it.grams);
  };

  const saveEdit = (it: LogItem) => {
    const g = editGrams;
    if (!(g > 0)) return;
    const f = g / (it.grams || 1); // reescala los macros proporcionalmente
    upd.mutate(
      {
        id: it.id,
        patch: {
          grams: g,
          kcal: Math.round(it.kcal * f),
          protein_g: +(it.protein_g * f).toFixed(1),
          carb_g: +(it.carb_g * f).toFixed(1),
          fat_g: +(it.fat_g * f).toFixed(1),
          fiber_g: it.fiber_g != null ? +(it.fiber_g * f).toFixed(1) : it.fiber_g,
          sugar_g: it.sugar_g != null ? +(it.sugar_g * f).toFixed(1) : it.sugar_g,
          sodium_mg: it.sodium_mg != null ? Math.round(it.sodium_mg * f) : it.sodium_mg,
        },
      },
      { onSuccess: () => setEditId(null) },
    );
  };

  /** Re-registra un frecuente en un toque, reusando su último snapshot. */
  const relog = (f: FrequentEntry) => {
    const it = f.last;
    add.mutate([
      {
        food_id: it.food_id,
        name: it.name,
        grams: it.grams,
        meal: it.meal,
        kcal: it.kcal,
        protein_g: it.protein_g,
        carb_g: it.carb_g,
        fat_g: it.fat_g,
        fiber_g: it.fiber_g,
        sugar_g: it.sugar_g,
        sodium_mg: it.sodium_mg,
        source: it.source,
      },
    ]);
  };

  return (
    <div className="p-4">
      <PageHeader title="Registrar comida" subtitle="Elegí el método más rápido" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {METHODS.map((m) => (
          <Link key={m.to} to={m.to} className="card flex flex-col items-start gap-1 active:scale-[.98]">
            <span className="text-2xl">{m.icon}</span>
            <span className="font-semibold text-slate-800">{m.title}</span>
            <span className="text-xs text-slate-400">{m.desc}</span>
          </Link>
        ))}
      </div>

      <Link to="/help" className="mt-2 block text-center text-sm text-green-700 underline">
        ¿Cómo funciona cada método?
      </Link>

      {frequents.length > 0 && (
        <>
          <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-500">
            Frecuentes · un toque para registrar
          </h3>
          <div className="flex flex-wrap gap-2">
            {frequents.map((f) => (
              <button
                key={f.key}
                onClick={() => relog(f)}
                disabled={add.isPending}
                className="rounded-full bg-white px-3 py-1.5 text-sm ring-1 ring-slate-200 active:scale-95 disabled:opacity-50"
              >
                {f.name} <span className="text-slate-400">· {f.last.grams}g</span>
              </button>
            ))}
          </div>
        </>
      )}

      <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-500">Hoy</h3>

      {removed && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>Eliminaste "{removed.name}".</span>
          <div className="flex items-center gap-3">
            <button onClick={undo} className="font-semibold underline">
              Deshacer
            </button>
            <button onClick={dismiss} aria-label="Cerrar" className="text-amber-500">
              ✕
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="Nada registrado todavía" description="Empezá con una foto de tu comida." />
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="card">
              {editId === it.id ? (
                <div className="space-y-2">
                  <div className="font-medium text-slate-800">{it.name}</div>
                  <div className="flex items-center gap-2">
                    <NumberInput value={editGrams} onValueChange={setEditGrams} className="w-24" />
                    <span className="text-sm text-slate-400">
                      g · {Math.round(it.kcal * (editGrams / (it.grams || 1)))} kcal
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(it)} disabled={upd.isPending || !(editGrams > 0)}>
                      {upd.isPending ? "Guardando…" : "Guardar"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditId(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-800">{it.name}</div>
                    <div className="text-xs text-slate-400">
                      {it.grams} g · {it.kcal} kcal · P{it.protein_g} C{it.carb_g} G{it.fat_g}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => startEdit(it)} className="text-sm text-slate-400" aria-label={`Editar ${it.name}`}>
                      ✏️
                    </button>
                    <button onClick={() => remove(it)} className="text-sm text-red-500" aria-label={`Eliminar ${it.name}`}>
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
