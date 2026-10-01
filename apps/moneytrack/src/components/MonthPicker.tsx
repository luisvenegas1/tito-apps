import { addMonths, currentMonth, monthLabel, type MonthKey } from "@/lib/dates";
import { cn } from "@titoapps/ui";

export function MonthPicker({ value, onChange, light }: { value: MonthKey; onChange: (m: MonthKey) => void; light?: boolean }) {
  const isCurrent = value === currentMonth();
  const btn = cn("rounded-full p-2 transition", light ? "text-white/70 hover:bg-white/10" : "text-muted hover:bg-surface-subtle");
  return (
    <div className="flex items-center gap-1">
      <button type="button" className={btn} onClick={() => onChange(addMonths(value, -1))} aria-label="Mes anterior">
        <Chevron dir="left" />
      </button>
      <span className="min-w-[8.5rem] text-center font-semibold">{monthLabel(value)}</span>
      <button
        type="button"
        className={cn(btn, isCurrent && "invisible")}
        onClick={() => onChange(addMonths(value, 1))}
        aria-label="Mes siguiente"
      >
        <Chevron dir="right" />
      </button>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}
