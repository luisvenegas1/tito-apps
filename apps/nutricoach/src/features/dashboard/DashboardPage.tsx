import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Skeleton, EmptyState } from "@titoapps/ui";
import { CalorieGauge } from "@/components/gauge/CalorieGauge";
import { MacroCard } from "./MacroCard";
import { useDashboard } from "./useDashboard";
import { CoachTip } from "@/features/coach/CoachTip";
import { QuickWater } from "@/features/health/QuickWater";
import { MealIdeasCard } from "./MealIdeasCard";
import { WelcomeTour, tourSeen } from "@/features/help/WelcomeTour";
import { ActivityReviewModal } from "@/features/goals/ActivityReviewModal";
import { todayISO, dayLabel } from "@/lib/date";

/** Barra superior del inicio con el ícono de ayuda que lleva a la sección de Ayuda. */
function HomeTopBar() {
  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-sm font-semibold text-slate-400">Inicio</span>
      <Link
        to="/help"
        aria-label="Ayuda"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg ring-1 ring-slate-200 active:scale-95"
      >
        ❓
      </Link>
    </div>
  );
}

/** Selector de día para revisar cómo estuviste en fechas anteriores. */
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

export function DashboardPage() {
  const [date, setDate] = useState(todayISO());
  const isToday = date === todayISO();
  const { data, isLoading } = useDashboard(date);
  const [tourOpen, setTourOpen] = useState(false);

  // Mini-tour la primera vez (saltable). Después se abre desde el ícono ❓.
  useEffect(() => {
    if (!tourSeen()) setTourOpen(true);
  }, []);

  const tour = <WelcomeTour open={tourOpen} onClose={() => setTourOpen(false)} />;

  if (isLoading || !data) {
    return (
      <div className="space-y-4 p-4">
        <HomeTopBar />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        {tour}
      </div>
    );
  }

  if (!data.targets) {
    return (
      <div className="space-y-4 p-4">
        <HomeTopBar />
        <EmptyState
          title="Definí tu objetivo"
          description="Para calcular tus metas diarias, contanos qué querés lograr."
          action={
            <Link to="/goals">
              <Button>Configurar objetivo</Button>
            </Link>
          }
        />
        {tour}
      </div>
    );
  }

  const { targets, consumed, remaining, waterMl, kcalBurned, weightKg, targetWeightKg } = data;

  const consumedKcal = Math.round(consumed.kcal);
  const diffKcal = targets.calorie_target - consumedKcal; // >0 quedó bajo, <0 se pasó
  const nothingLogged = consumedKcal === 0 && data.items.length === 0;

  return (
    <div className="space-y-5 p-4">
      <HomeTopBar />
      {tour}
      {isToday && <ActivityReviewModal />}

      <DaySwitcher date={date} setDate={setDate} />

      <section className="card flex flex-col items-center pt-6">
        <CalorieGauge consumed={consumed.kcal} target={targets.calorie_target} />
        <Link to={`/log?date=${date}`} className="mt-4 w-full">
          <Button className="w-full">{isToday ? "+ Registrar comida" : "+ Agregar a este día"}</Button>
        </Link>
      </section>

      {/* Resultado del día pasado: te pasaste o quedaste bajo el límite */}
      {!isToday &&
        (nothingLogged ? (
          <div className="card text-center text-sm text-slate-500">No registraste comidas este día.</div>
        ) : (
          <div
            className={`card text-center text-sm font-semibold ${
              diffKcal >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}
          >
            {diffKcal >= 0
              ? `✅ Quedaste ${diffKcal} kcal por debajo de tu límite`
              : `⚠️ Te pasaste ${Math.abs(diffKcal)} kcal de tu límite`}
            <div className="mt-0.5 text-xs font-normal text-slate-500">
              {consumedKcal} de {targets.calorie_target} kcal
            </div>
          </div>
        ))}

      {isToday && <CoachTip />}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/plan" className="card flex items-center gap-2 active:scale-[.98]">
          <span className="text-xl" aria-hidden>🍽️</span>
          <span className="text-sm font-semibold text-slate-700">Plan de comidas</span>
        </Link>
        <Link to="/history" className="card flex items-center gap-2 active:scale-[.98]">
          <span className="text-xl" aria-hidden>📊</span>
          <span className="text-sm font-semibold text-slate-700">Ver progreso</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MacroCard label="Proteína" value={consumed.protein_g} target={targets.protein_g} unit="g" accent="#16a34a" />
        <MacroCard label="Carbohidratos" value={consumed.carb_g} target={targets.carb_g} unit="g" accent="#f59e0b" />
        <MacroCard label="Grasa" value={consumed.fat_g} target={targets.fat_g} unit="g" accent="#f97316" />
        <MacroCard label="Fibra" value={consumed.fiber_g ?? 0} target={targets.fiber_g} unit="g" accent="#22c55e" />
        <MacroCard label="Azúcar" value={consumed.sugar_g ?? 0} target={null} unit="g" accent="#ef4444" />
        <MacroCard label="Sodio" value={consumed.sodium_mg ?? 0} target={null} unit="mg" accent="#64748b" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MacroCard label="Agua" value={waterMl} target={targets.water_ml} unit="ml" accent="#0ea5e9" />
        <Link to="/workouts" className="block active:scale-[.98]">
          <MacroCard label="Actividad 🔥" value={kcalBurned} target={null} unit="kcal" accent="#8b5cf6" />
        </Link>
      </div>

      {isToday && <QuickWater />}

      {isToday && remaining && (
        <p className="px-1 text-center text-sm text-slate-500">
          Te faltan <b className="text-slate-700">{Math.max(0, Math.round(remaining.kcal))} kcal</b> y{" "}
          <b className="text-slate-700">{Math.max(0, Math.round(remaining.protein_g))} g</b> de proteína hoy.
        </p>
      )}

      {isToday && remaining && <MealIdeasCard remaining={remaining} />}

      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="metric-label">Peso actual</div>
          <div className="metric-value mt-1">{weightKg != null ? `${weightKg} kg` : "—"}</div>
        </div>
        <div className="card">
          <div className="metric-label">Objetivo</div>
          <div className="metric-value mt-1">{targetWeightKg != null ? `${targetWeightKg} kg` : "—"}</div>
        </div>
      </div>
    </div>
  );
}
