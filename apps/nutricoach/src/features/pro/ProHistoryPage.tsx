import { useState } from "react";
import { PageHeader, Skeleton } from "@titoapps/ui";
import { BADGES, type DayStatus } from "@titoapps/nutrition";
import { dayLabel } from "@/lib/date";
import { useProRange, useBadges, useSyncBadges } from "./usePro";
import { rangeStats, statusPoints, buildBadgeStats, type RangeDay } from "./proLogic";

const RANGES = [7, 30, 90] as const;

const STATUS_STYLE: Record<DayStatus, { bg: string; emoji: string; label: string }> = {
  complete: { bg: "bg-green-500", emoji: "🟩", label: "Completo" },
  partial: { bg: "bg-amber-400", emoji: "🟨", label: "Parcial" },
  low: { bg: "bg-red-400", emoji: "🟥", label: "Bajo" },
  none: { bg: "bg-slate-200", emoji: "⬜", label: "Sin registro" },
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-200">
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="mt-0.5 text-xs text-slate-400">{label}</div>
    </div>
  );
}

/** Mapa de calor de cumplimiento diario. */
function Heatmap({ range }: { range: RangeDay[] }) {
  const points = statusPoints(range);
  return (
    <div className="flex flex-wrap gap-1">
      {points.map((p) => (
        <div
          key={p.date}
          title={`${dayLabel(p.date)} · ${STATUS_STYLE[p.status].label} (${p.pct}%)`}
          className={`h-5 w-5 rounded ${STATUS_STYLE[p.status].bg}`}
        />
      ))}
    </div>
  );
}

/** Historial, estadísticas, mapa de calor y logros del modo profesional. */
export function ProHistoryPage() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const { isLoading, range } = useProRange(days);
  const { data: earned = [] } = useBadges();
  useSyncBadges();

  const stats = rangeStats(range);
  const earnedIds = new Set(earned.map((b) => b.badge_id));
  const badgeStats = buildBadgeStats(range);
  const loggedDays = [...range].reverse().filter((r) => r.day.anyLogged);

  return (
    <div className="pb-8">
      <PageHeader title="Mi progreso" subtitle="Cumplimiento, rachas y logros" />

      <div className="space-y-5 p-4">
        {/* Rango */}
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium ring-1 ${days === r ? "bg-green-600 text-white ring-green-600" : "bg-white text-slate-600 ring-slate-200"}`}
            >
              {r} días
            </button>
          ))}
        </div>

        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : (
          <>
            {/* Estadísticas */}
            <section className="grid grid-cols-3 gap-2">
              <Stat label="Cumplimiento prom." value={`${stats.avgCompliance}%`} />
              <Stat label="Días completos" value={stats.daysComplete} />
              <Stat label="Racha actual 🔥" value={stats.current} />
            </section>
            <section className="grid grid-cols-3 gap-2">
              <Stat label="Días parciales" value={stats.daysPartial} />
              <Stat label="Sin registro" value={stats.daysNone} />
              <Stat label="Mejor racha" value={stats.best} />
            </section>

            {(stats.bestCategory || stats.hardestCategory) && (
              <section className="card space-y-1 text-sm">
                {stats.bestCategory && <div className="text-slate-600">💚 Tu mejor categoría: <span className="font-semibold text-slate-800">{stats.bestCategory}</span></div>}
                {stats.hardestCategory && <div className="text-slate-600">🎯 La que más te cuesta: <span className="font-semibold text-slate-800">{stats.hardestCategory}</span></div>}
              </section>
            )}

            {/* Mapa de calor */}
            <section className="card space-y-2">
              <h3 className="text-sm font-semibold text-slate-500">Mapa de calor</h3>
              <Heatmap range={range} />
              <div className="flex flex-wrap gap-3 pt-1 text-xs text-slate-400">
                {(Object.keys(STATUS_STYLE) as DayStatus[]).map((s) => (
                  <span key={s} className="flex items-center gap-1"><span className={`h-3 w-3 rounded ${STATUS_STYLE[s].bg}`} />{STATUS_STYLE[s].label}</span>
                ))}
              </div>
            </section>

            {/* Logros */}
            <section className="space-y-2">
              <h3 className="px-1 text-sm font-semibold text-slate-500">Logros</h3>
              <div className="grid grid-cols-2 gap-2">
                {BADGES.map((b) => {
                  const has = earnedIds.has(b.id) || b.test(badgeStats);
                  return (
                    <div key={b.id} className={`card flex items-center gap-3 ${has ? "" : "opacity-40 grayscale"}`}>
                      <span className="text-2xl" aria-hidden>{b.emoji}</span>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{b.title}</div>
                        <div className="text-xs text-slate-400">{b.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Historial diario */}
            <section className="space-y-2">
              <h3 className="px-1 text-sm font-semibold text-slate-500">Historial</h3>
              {loggedDays.length === 0 ? (
                <p className="rounded-xl bg-white px-3 py-4 text-center text-sm text-slate-400 ring-1 ring-slate-200">Todavía no hay días registrados.</p>
              ) : (
                <div className="space-y-1.5">
                  {loggedDays.map((r) => (
                    <div key={r.date} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                      <span className="flex items-center gap-2 text-sm text-slate-700">
                        <span aria-hidden>{STATUS_STYLE[r.day.status].emoji}</span>{dayLabel(r.date)}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">{r.day.pct}% {r.day.complete && "✓"}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
