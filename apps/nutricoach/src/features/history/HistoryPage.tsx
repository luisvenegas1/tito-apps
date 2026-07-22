import { useState } from "react";
import { PageHeader, EmptyState, Skeleton } from "@titoapps/ui";
import { sumMacros, average } from "@titoapps/nutrition";
import { useDailyLog } from "@/features/log/useLog";
import { useHistory } from "./useHistory";
import { MEALS } from "@/features/log/helpers";
import { BarTrend } from "@/components/charts/BarTrend";
import { LineTrend } from "@/components/charts/LineTrend";
import type { Meal } from "@/lib/supabase/types";

type Range = "day" | "week" | "month";

export function HistoryPage() {
  const [range, setRange] = useState<Range>("day");
  return (
    <div className="p-4">
      <PageHeader title="Historial" subtitle="Tu progreso" />
      <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1">
        {(["day", "week", "month"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium ${
              range === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {r === "day" ? "Hoy" : r === "week" ? "Semana" : "Mes"}
          </button>
        ))}
      </div>

      {range === "day" ? <DayView /> : <RangeView days={range === "week" ? 7 : 30} />}
    </div>
  );
}

function DayView() {
  const { data: items = [] } = useDailyLog();
  const total = sumMacros(items);
  return (
    <div className="mt-4">
      <TotalsCard kcal={total.kcal} p={total.protein_g} c={total.carb_g} g={total.fat_g} />
      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Sin registros hoy" description="Lo que registres aparecerá agrupado por comida." />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {MEALS.map(({ value, label }) => {
            const group = items.filter((i) => i.meal === (value as Meal));
            if (group.length === 0) return null;
            return (
              <div key={value}>
                <h3 className="mb-1 text-sm font-semibold text-slate-500">{label}</h3>
                <ul className="space-y-2">
                  {group.map((it) => (
                    <li key={it.id} className="card flex items-center justify-between">
                      <span className="text-slate-800">{it.name}</span>
                      <span className="text-xs text-slate-400">
                        {it.grams} g · {it.kcal} kcal
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RangeView({ days }: { days: number }) {
  const { data, isLoading } = useHistory();
  if (isLoading || !data) {
    return <Skeleton className="mt-4 h-64 w-full" />;
  }
  const window = data.days.slice(-days);
  const kcals = window.map((d) => d.macros.kcal);
  const avgKcal = Math.round(average(kcals.filter((k) => k > 0)));
  const target = data.targets?.calorie_target ?? null;

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card">
          <Stat label="Adherencia" value={data.adherence ? `${data.adherence.adherencePct}%` : "—"} />
        </div>
        <div className="card">
          <Stat label="Racha" value={`${data.streak} d`} />
        </div>
        <div className="card">
          <Stat label="Prom. kcal" value={avgKcal ? String(avgKcal) : "—"} />
        </div>
      </div>

      <div className="card">
        <div className="metric-label mb-2">Calorías por día</div>
        <BarTrend values={kcals} target={target} />
        {target && (
          <p className="mt-2 text-xs text-slate-400">
            Línea punteada = meta ({target} kcal). Ámbar = por encima de la meta.
          </p>
        )}
      </div>

      <div className="card">
        <div className="metric-label mb-2">Peso</div>
        <LineTrend points={data.weights.map((w) => ({ x: w.date, y: w.kg }))} />
      </div>

      {data.maintenance != null && (
        <div className="card border-l-4 border-l-green-500 bg-green-50/60">
          <div className="metric-label text-green-700">Mantenimiento adaptativo</div>
          <p className="mt-1 text-sm text-slate-700">
            Según tu ingesta y tendencia de peso reales, tu mantenimiento estimado es{" "}
            <b>{data.maintenance} kcal/día</b>. Se recalcula solo conforme registrás.
          </p>
        </div>
      )}
    </div>
  );
}

function TotalsCard({ kcal, p, c, g }: { kcal: number; p: number; c: number; g: number }) {
  return (
    <div className="card grid grid-cols-4 gap-2 text-center">
      <Stat label="kcal" value={String(Math.round(kcal))} />
      <Stat label="Prot" value={String(Math.round(p))} />
      <Stat label="Carbs" value={String(Math.round(c))} />
      <Stat label="Grasa" value={String(Math.round(g))} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-slate-900 tabular-nums">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
