import { rankMealIdeas, type Remaining } from "@titoapps/nutrition";
import { FOOD_LIBRARY } from "@/features/log/foodLibrary";
import { useAddFood } from "@/features/log/useLog";
import { mealByHour } from "@/features/log/helpers";

/**
 * Ideas de comida según los macros faltantes del día.
 * "Te faltan X g de proteína / Y kcal → probá esto." Un toque para registrar.
 */
export function MealIdeasCard({ remaining }: { remaining: Remaining }) {
  const add = useAddFood();

  // Solo tiene sentido sugerir si aún hay margen calórico y de proteína.
  if (remaining.kcal < 120 || remaining.protein_g < 8) return null;

  const ideas = rankMealIdeas(remaining, FOOD_LIBRARY, 3);
  if (ideas.length === 0) return null;

  return (
    <div className="card">
      <div className="metric-label mb-1">Ideas para cerrar tu día</div>
      <p className="mb-3 text-xs text-slate-400">
        Te faltan {Math.round(remaining.protein_g)} g de proteína y {Math.round(remaining.kcal)} kcal.
      </p>
      <div className="space-y-2">
        {ideas.map((idea) => (
          <div key={idea.name} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-800">{idea.name}</div>
              <div className="text-xs text-slate-400">
                {idea.grams} g · {idea.macros.kcal} kcal · {idea.macros.protein_g} g prot
              </div>
            </div>
            <button
              onClick={() =>
                add.mutate([
                  {
                    name: idea.name,
                    grams: idea.grams,
                    meal: mealByHour(),
                    kcal: idea.macros.kcal,
                    protein_g: idea.macros.protein_g,
                    carb_g: idea.macros.carb_g,
                    fat_g: idea.macros.fat_g,
                    fiber_g: idea.macros.fiber_g ?? null,
                    sugar_g: idea.macros.sugar_g ?? null,
                    sodium_mg: idea.macros.sodium_mg ?? null,
                    source: "custom",
                  },
                ])
              }
              disabled={add.isPending}
              className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700 active:scale-95 disabled:opacity-50"
            >
              + Registrar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
