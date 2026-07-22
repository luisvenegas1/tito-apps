import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, PageHeader, Spinner, EmptyState } from "@titoapps/ui";
import { useActiveGoal } from "@/features/goals/useGoal";
import { useGeneratePlan } from "./usePlan";

const MEAL_LABEL: Record<string, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snack",
};

export function PlanPage() {
  const { data: goal } = useActiveGoal();
  const gen = useGeneratePlan();
  const [days, setDays] = useState(1);

  if (!goal) {
    return (
      <div className="p-4">
        <PageHeader title="Plan de comidas" />
        <div className="mt-4">
          <EmptyState
            title="Configurá tu objetivo"
            description="El plan se genera a partir de tus metas diarias."
            action={
              <Link to="/goals">
                <Button>Configurar objetivo</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <PageHeader title="Plan de comidas" subtitle="Generado por IA según tus metas" />

      <div className="mt-4 flex gap-2">
        {[
          { d: 1, label: "Un día" },
          { d: 7, label: "Semana" },
        ].map(({ d, label }) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium ring-1 ${
              days === d ? "bg-green-600 text-white ring-green-600" : "bg-white text-slate-600 ring-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Button className="mt-3 w-full" onClick={() => gen.mutate({ days })} disabled={gen.isPending}>
        {gen.isPending ? <Spinner /> : "Generar plan"}
      </Button>

      {gen.error && <p className="mt-3 text-sm text-red-600">{gen.error.message}</p>}

      {gen.data && (
        <div className="mt-5 space-y-4">
          {gen.data.plan.map((day, i) => {
            const total = day.meals.reduce((s, m) => s + m.kcal, 0);
            return (
              <div key={i}>
                <div className="mb-1 flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-slate-600">{day.label}</h3>
                  <span className="text-xs text-slate-400">{total} kcal</span>
                </div>
                <div className="space-y-2">
                  {day.meals.map((m, j) => (
                    <div key={j} className="card flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          {MEAL_LABEL[m.meal] ?? m.meal}
                        </div>
                        <div className="font-medium text-slate-800">{m.title}</div>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        {m.kcal} kcal<br />
                        {m.protein_g} g prot
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <p className="text-center text-xs text-slate-400">
            Sugerencia generada por IA. Ajustala a tu gusto y registrá lo que comas.
          </p>
        </div>
      )}
    </div>
  );
}
