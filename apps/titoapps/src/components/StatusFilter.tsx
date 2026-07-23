import { statusLabels } from "@/data/apps";
import type { AppStatus } from "@/types/app";

export function StatusFilter({ statuses, value, onChange }: { statuses: readonly AppStatus[]; value: AppStatus | "all"; onChange: (value: AppStatus | "all") => void }) {
  return <fieldset><legend className="sr-only">Filtrar por estado</legend><div className="flex flex-wrap gap-2"><button type="button" aria-pressed={value === "all"} onClick={() => onChange("all")} className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${value === "all" ? "bg-primary text-primary-contrast" : "bg-surface text-muted ring-1 ring-border hover:text-fg"}`}>Todos los estados</button>{statuses.map((status) => <button key={status} type="button" aria-pressed={value === status} onClick={() => onChange(status)} className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${value === status ? "bg-primary text-primary-contrast" : "bg-surface text-muted ring-1 ring-border hover:text-fg"}`}>{statusLabels[status]}</button>)}</div></fieldset>;
}
