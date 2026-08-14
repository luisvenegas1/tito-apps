import type { NutritionMode } from "@/lib/supabase/types";

interface Option {
  id: NutritionMode;
  emoji: string;
  title: string;
  desc: string;
}

const OPTIONS: Option[] = [
  {
    id: "personal",
    emoji: "🥗",
    title: "NutriCoach Personal",
    desc: "Quiero controlar mis calorías, macros y alimentación por mi cuenta.",
  },
  {
    id: "professional",
    emoji: "👩‍⚕️",
    title: "Seguimiento Profesional",
    desc: "Tengo un plan de una nutricionista y quiero llevar el seguimiento de mis porciones.",
  },
];

interface Props {
  current?: NutritionMode | null;
  disabled?: boolean;
  onSelect: (m: NutritionMode) => void;
}

/** Tarjetas de selección de modo. Reutilizado en el onboarding y en Ajustes. */
export function ModeSelect({ current, disabled, onSelect }: Props) {
  return (
    <div className="space-y-3">
      {OPTIONS.map((o) => {
        const active = current === o.id;
        return (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(o.id)}
            className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition active:scale-[.99] disabled:opacity-60 ${
              active ? "border-green-600 bg-green-50 ring-1 ring-green-600" : "border-slate-200 bg-white"
            }`}
          >
            <span className="text-3xl" aria-hidden>
              {o.emoji}
            </span>
            <span className="flex-1">
              <span className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">{o.title}</span>
                {active && <span className="text-xs font-semibold text-green-700">Activo</span>}
              </span>
              <span className="mt-0.5 block text-sm text-slate-500">{o.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
