import { categoryLabels } from "@/data/apps";
import type { AppCategory } from "@/types/app";

export function CategoryFilter({ categories, value, onChange }: { categories: readonly AppCategory[]; value: AppCategory | "all"; onChange: (value: AppCategory | "all") => void }) {
  return <fieldset><legend className="sr-only">Filtrar por categoría</legend><div className="flex flex-wrap gap-2"><button type="button" aria-pressed={value === "all"} onClick={() => onChange("all")} className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${value === "all" ? "bg-secondary text-white" : "bg-surface text-muted ring-1 ring-border hover:text-fg"}`}>Todas</button>{categories.map((category) => <button key={category} type="button" aria-pressed={value === category} onClick={() => onChange(category)} className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${value === category ? "bg-secondary text-white" : "bg-surface text-muted ring-1 ring-border hover:text-fg"}`}>{categoryLabels[category]}</button>)}</div></fieldset>;
}
