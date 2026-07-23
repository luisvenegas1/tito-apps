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

export function DashboardPage() {
  const { data, isLoading } = useDashboard();
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

  return (
    <div className="space-y-5 p-4">
      <HomeTopBar />
      {tour}
      <section className="card flex flex-col items-center pt-6">
        <CalorieGauge consumed={consumed.kcal} target={targets.calorie_target} />
        <Link to="/log" className="mt-4 w-full">
          <Button className="w-full">+ Registrar comida</Button>
        </Link>
      </section>

      <CoachTip />

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

      <QuickWater />

      {remaining && (
        <p className="px-1 text-center text-sm text-slate-500">
          Te faltan <b className="text-slate-700">{Math.max(0, Math.round(remaining.kcal))} kcal</b> y{" "}
          <b className="text-slate-700">{Math.max(0, Math.round(remaining.protein_g))} g</b> de proteína hoy.
        </p>
      )}

      {remaining && <MealIdeasCard remaining={remaining} />}

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
