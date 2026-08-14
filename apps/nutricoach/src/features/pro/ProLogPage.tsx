import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Spinner, EmptyState } from "@titoapps/ui";
import { NumberInput } from "@/components/ui/NumberInput";
import { todayISO, dayLabel } from "@/lib/date";
import { MEALS } from "@/features/log/helpers";
import type { ExchangeEntry, PlanCategory } from "@/lib/supabase/types";
import { useProDay, useUpdateExchange, useDeleteExchange } from "./usePro";
import { ProQuickAdd } from "./ProQuickAdd";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ""));
const mealLabel = (m: string | null) => MEALS.find((x) => x.value === m)?.label ?? "—";

function DaySwitcher({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const isToday = date === todayISO();
  const shift = (days: number) => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + days);
    const iso = todayISO(d);
    if (iso <= todayISO()) setDate(iso);
  };
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
      <button onClick={() => shift(-1)} className="px-2 text-lg text-slate-500 active:scale-90" aria-label="Día anterior">‹</button>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-700">{dayLabel(date)}</span>
        <input type="date" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500" />
      </div>
      <button onClick={() => shift(1)} disabled={isToday} className="px-2 text-lg text-slate-500 active:scale-90 disabled:opacity-30" aria-label="Día siguiente">›</button>
    </div>
  );
}

/** Una entrada registrada: editar cantidad al toque o eliminar (recalcula al instante). */
function EntryRow({ entry, category, date }: { entry: ExchangeEntry; category?: PlanCategory; date: string }) {
  const upd = useUpdateExchange(date);
  const del = useDeleteExchange(date);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(Number(entry.amount));

  const save = () => {
    if (amount > 0 && amount !== Number(entry.amount)) upd.mutate({ id: entry.id, patch: { amount } });
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-2 ring-1 ring-slate-200">
      <span className="text-lg" aria-hidden>{category?.emoji ?? "•"}</span>
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-700">
          {category?.name ?? "Categoría"} · {fmt(Number(entry.amount))}
        </div>
        <div className="text-xs text-slate-400">{entry.name ? `${entry.name} · ` : ""}{mealLabel(entry.meal)}</div>
      </div>
      {editing ? (
        <div className="flex items-center gap-1">
          <NumberInput value={amount} onValueChange={setAmount} step={0.5} min={0} className="w-16" />
          <button onClick={save} disabled={upd.isPending} className="rounded-lg bg-green-600 px-2 py-1 text-xs font-semibold text-white active:scale-95">OK</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(true)} className="text-slate-400" aria-label="Editar cantidad">✏️</button>
          <button onClick={() => del.mutate(entry.id)} disabled={del.isPending} className="text-slate-300 hover:text-red-500" aria-label="Eliminar">✕</button>
        </div>
      )}
    </div>
  );
}

const METHODS = [
  { method: "photo", emoji: "📷", label: "Analizar foto" },
  { method: "text", emoji: "✍️", label: "Describir" },
  { method: "barcode", emoji: "🔎", label: "Escanear" },
  { method: "label", emoji: "🏷️", label: "Etiqueta" },
] as const;

/** Registro de comida del modo profesional: rápido, por método, y edición de lo del día. */
export function ProLogPage() {
  const [date, setDate] = useState(todayISO());
  const { isLoading, categories, entries } = useProDay(date);
  const catById = (id: string) => categories.find((c) => c.id === id);

  return (
    <div className="pb-8">
      <PageHeader title="Registrar" subtitle="Sumá intercambios a tu plan" />

      <div className="space-y-5 p-4">
        <DaySwitcher date={date} setDate={setDate} />

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : categories.filter((c) => c.is_active).length === 0 ? (
          <EmptyState title="Configurá tu plan" description="Necesitás metas de intercambios para registrar." action={<Link to="/plan-pro" className="text-green-600 underline">Configurar mi plan</Link>} />
        ) : (
          <>
            <section className="space-y-2">
              <h3 className="px-1 text-sm font-semibold text-slate-500">Registro rápido</h3>
              <ProQuickAdd categories={categories} date={date} />
            </section>

            <section className="space-y-2">
              <h3 className="px-1 text-sm font-semibold text-slate-500">Analizar comida</h3>
              <div className="grid grid-cols-4 gap-2">
                {METHODS.map((m) => (
                  <Link key={m.method} to={`/pro/capture?method=${m.method}&date=${date}`} className="card flex flex-col items-center gap-1 py-3 active:scale-95">
                    <span className="text-xl" aria-hidden>{m.emoji}</span>
                    <span className="text-[11px] font-medium text-slate-600">{m.label}</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="px-1 text-sm font-semibold text-slate-500">Registrado {date === todayISO() ? "hoy" : "este día"}</h3>
              {entries.length === 0 ? (
                <p className="rounded-xl bg-white px-3 py-4 text-center text-sm text-slate-400 ring-1 ring-slate-200">Todavía no registraste nada.</p>
              ) : (
                <div className="space-y-2">
                  {entries.map((e) => <EntryRow key={e.id} entry={e} category={catById(e.category_id)} date={date} />)}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
