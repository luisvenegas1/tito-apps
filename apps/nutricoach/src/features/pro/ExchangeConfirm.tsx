import { useState } from "react";
import { Button, Input } from "@titoapps/ui";
import { NumberInput } from "@/components/ui/NumberInput";
import { macrosToExchanges } from "@titoapps/nutrition";
import type { PlanCategory, ExchangeSource, Meal } from "@/lib/supabase/types";
import { MEALS, mealByHour } from "@/features/log/helpers";
import { toDefs } from "./proLogic";
import { useAddExchanges } from "./usePro";

export interface DetectedMacros {
  protein_g?: number;
  carb_g?: number;
  fat_g?: number;
  kcal?: number;
}

interface Props {
  categories: PlanCategory[];
  date: string;
  macros: DetectedMacros;
  defaultName?: string;
  source: ExchangeSource;
  onDone: () => void;
  onBack?: () => void;
  backLabel?: string;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ""));

/**
 * Confirmación de intercambios detectados (foto / código de barras / etiqueta /
 * texto). Muestra la estimación ANTES de guardar; todo editable. Nunca guarda
 * automáticamente: el usuario confirma.
 */
export function ExchangeConfirm({ categories, date, macros, defaultName, source, onDone, onBack, backLabel }: Props) {
  const add = useAddExchanges(date);
  const active = categories.filter((c) => c.is_active);
  const suggested = macrosToExchanges(toDefs(categories), macros);

  const [amounts, setAmounts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const c of active) init[c.id] = suggested[c.id] ?? 0;
    return init;
  });
  const [name, setName] = useState(defaultName ?? "");
  const [meal, setMeal] = useState<Meal>(mealByHour());

  const setAmount = (id: string, v: number) => setAmounts((p) => ({ ...p, [id]: Math.max(0, v) }));

  const anyDetected = active.some((c) => (suggested[c.id] ?? 0) > 0);

  const confirm = () => {
    const entries = active
      .filter((c) => (amounts[c.id] ?? 0) > 0)
      .map((c) => ({ category_id: c.id, amount: amounts[c.id], name: name.trim() || null, meal, source }));
    if (entries.length === 0) return;
    add.mutate(entries, { onSuccess: onDone });
  };

  return (
    <div className="space-y-3">
      <div className="card bg-green-50">
        <div className="text-sm font-semibold text-green-800">Detectamos</div>
        {anyDetected ? (
          <ul className="mt-1 space-y-0.5 text-sm text-green-800">
            {active.filter((c) => (suggested[c.id] ?? 0) > 0).map((c) => (
              <li key={c.id}>✓ {fmt(suggested[c.id])} {c.name.toLowerCase()} {c.emoji ?? ""}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-green-800">
            No pudimos estimar intercambios automáticamente. Ajustá las cantidades abajo según tu plan.
          </p>
        )}
        <p className="mt-1 text-xs text-green-700/80">Estimación según tu plan · revisá antes de agregar.</p>
      </div>

      <div>
        <label className="label">Nombre (opcional)</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Pollo con arroz" />
      </div>

      <div>
        <label className="label">Comida</label>
        <div className="flex flex-wrap gap-2">
          {MEALS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMeal(m.value)}
              className={`rounded-full px-3 py-1.5 text-sm ring-1 ${meal === m.value ? "bg-green-600 text-white ring-green-600" : "bg-white text-slate-600 ring-slate-200"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="label">Intercambios a registrar</label>
        {active.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl bg-white p-2 ring-1 ring-slate-200">
            <span className="flex flex-1 items-center gap-2 text-sm font-medium text-slate-700">
              <span aria-hidden>{c.emoji ?? "•"}</span>{c.name}
            </span>
            <NumberInput value={amounts[c.id] ?? 0} onValueChange={(v) => setAmount(c.id, v)} step={0.5} min={0} className="w-20" />
          </div>
        ))}
      </div>

      <Button className="w-full" onClick={confirm} disabled={add.isPending}>
        {add.isPending ? "Agregando…" : "Agregar a mi día"}
      </Button>
      {onBack && (
        <button className="w-full text-center text-sm text-slate-400" onClick={onBack}>{backLabel ?? "Volver"}</button>
      )}
    </div>
  );
}
