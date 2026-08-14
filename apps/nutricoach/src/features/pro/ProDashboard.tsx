import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Skeleton, EmptyState } from "@titoapps/ui";
import { todayISO, dayLabel } from "@/lib/date";
import type { CategoryProgress } from "@titoapps/nutrition";
import { CoachTip } from "@/features/coach/CoachTip";
import { useProDay, useProRange, useSyncBadges } from "./usePro";
import { rangeStats } from "./proLogic";
import { ProQuickAdd } from "./ProQuickAdd";

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
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500"
        />
      </div>
      <button onClick={() => shift(1)} disabled={isToday} className="px-2 text-lg text-slate-500 active:scale-90 disabled:opacity-30" aria-label="Día siguiente">›</button>
    </div>
  );
}

/** Tarjeta de una categoría: consumido / meta con barra de progreso. */
function CategoryCard({ c, emoji }: { c: CategoryProgress; emoji: string }) {
  const pct = c.target > 0 ? Math.min(100, (c.consumed / c.target) * 100) : c.consumed > 0 ? 100 : 0;
  const over = c.target > 0 && c.consumed > c.target;
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold text-slate-700">
          <span className="text-lg" aria-hidden>{emoji}</span>
          {c.name}
        </span>
        <span className={`text-sm font-bold ${c.met ? "text-green-600" : "text-slate-800"}`}>
          {formatEx(c.consumed)} / {formatEx(c.target)}
          {c.met && " ✓"}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${c.met ? "bg-green-500" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
      </div>
      {over && <div className="mt-1 text-right text-xs text-slate-400">Superaste la meta (+{formatEx(c.consumed - c.target)})</div>}
    </div>
  );
}

function formatEx(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

/** Dashboard del modo Seguimiento Profesional: "¿Cómo voy hoy?" en intercambios. */
export function ProDashboard() {
  const [date, setDate] = useState(todayISO());
  const isToday = date === todayISO();
  const { isLoading, categories, compliance } = useProDay(date);
  const { range } = useProRange(30);
  useSyncBadges();

  const emojiOf = (name: string) => categories.find((c) => c.name === name)?.emoji ?? "•";
  const streak = rangeStats(range).current;

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      </div>
    );
  }

  const activeCats = compliance.categories.filter((c) => {
    const src = categories.find((x) => x.id === c.id);
    return src?.is_active;
  });
  const missing = activeCats.filter((c) => !c.met && c.remaining > 0);

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-slate-400">Mi plan</span>
        <Link to="/help" aria-label="Ayuda" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg ring-1 ring-slate-200 active:scale-95">❓</Link>
      </div>

      <DaySwitcher date={date} setDate={setDate} />

      {activeCats.length === 0 ? (
        <EmptyState
          title="Configurá tu plan"
          description="Ingresá las metas de intercambios que te indicó tu nutricionista."
          action={<Link to="/plan-pro"><Button>Configurar mi plan</Button></Link>}
        />
      ) : (
        <>
          {/* Cumplimiento del día */}
          <section className="card flex items-center justify-between">
            <div>
              <div className="metric-label">Cumplimiento de {dayLabel(date).toLowerCase()}</div>
              <div className="mt-0.5 text-3xl font-bold text-slate-800">{compliance.pct}%</div>
            </div>
            <div className="text-right">
              <div className="text-2xl">{compliance.complete ? "🎉" : compliance.anyLogged ? "💪" : "🍽️"}</div>
              <div className="text-xs text-slate-400">{compliance.complete ? "Completo" : compliance.anyLogged ? "En camino" : "Sin registro"}</div>
            </div>
          </section>

          {/* MI PLAN DE HOY */}
          <section className="space-y-2">
            <h3 className="px-1 text-sm font-semibold text-slate-500">Mi plan de {isToday ? "hoy" : "este día"}</h3>
            {activeCats.map((c) => <CategoryCard key={c.id} c={c} emoji={emojiOf(c.name)} />)}
          </section>

          {/* TE FALTA */}
          {missing.length > 0 && (
            <section className="card bg-amber-50">
              <div className="text-sm font-semibold text-amber-800">Te falta</div>
              <ul className="mt-1 space-y-0.5 text-sm text-amber-800">
                {missing.map((c) => (
                  <li key={c.id}>{emojiOf(c.name)} {formatEx(c.remaining)} {c.name.toLowerCase()}</li>
                ))}
              </ul>
            </section>
          )}
          {activeCats.length > 0 && missing.length === 0 && compliance.anyLogged && (
            <section className="card bg-green-50 text-center text-sm font-semibold text-green-700">
              ✅ Completaste tu plan de {dayLabel(date).toLowerCase()}
            </section>
          )}

          {/* Racha */}
          {isToday && (
            <section className="card flex items-center justify-between">
              <span className="font-semibold text-slate-700">🔥 Racha actual</span>
              <span className="text-lg font-bold text-slate-800">{streak} {streak === 1 ? "día" : "días"}</span>
            </section>
          )}

          {isToday && <CoachTip />}

          {/* Registro rápido de intercambios */}
          {isToday && (
            <section className="space-y-2">
              <h3 className="px-1 text-sm font-semibold text-slate-500">Registro rápido</h3>
              <ProQuickAdd categories={categories} date={date} />
            </section>
          )}

          {/* Acciones */}
          <section className="grid grid-cols-2 gap-3">
            <Link to={`/log?date=${date}`} className="card flex items-center gap-2 active:scale-[.98]">
              <span className="text-xl" aria-hidden>🍽️</span><span className="text-sm font-semibold text-slate-700">Registrar comida</span>
            </Link>
            <Link to={`/pro/capture?method=photo&date=${date}`} className="card flex items-center gap-2 active:scale-[.98]">
              <span className="text-xl" aria-hidden>📷</span><span className="text-sm font-semibold text-slate-700">Analizar comida</span>
            </Link>
            <Link to={`/pro/capture?method=barcode&date=${date}`} className="card flex items-center gap-2 active:scale-[.98]">
              <span className="text-xl" aria-hidden>🔎</span><span className="text-sm font-semibold text-slate-700">Escanear producto</span>
            </Link>
            <Link to="/coach" className="card flex items-center gap-2 active:scale-[.98]">
              <span className="text-xl" aria-hidden>🤖</span><span className="text-sm font-semibold text-slate-700">Preguntar al Coach</span>
            </Link>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <Link to="/history" className="card flex items-center gap-2 active:scale-[.98]">
              <span className="text-xl" aria-hidden>📊</span><span className="text-sm font-semibold text-slate-700">Historial y logros</span>
            </Link>
            <Link to="/plan-pro" className="card flex items-center gap-2 active:scale-[.98]">
              <span className="text-xl" aria-hidden>📋</span><span className="text-sm font-semibold text-slate-700">Editar mi plan</span>
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
