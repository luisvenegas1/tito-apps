interface Props {
  label: string;
  value: number;
  target?: number | null;
  unit: string;
  accent?: string;
}

/** Tarjeta compacta de una métrica: valor grande + barra fina. Sin saturar de números. */
export function MacroCard({ label, value, target, unit, accent = "#16a34a" }: Props) {
  const pct = target && target > 0 ? Math.min(value / target, 1) : 0;
  return (
    <div className="card">
      <div className="metric-label">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="metric-value">{Math.round(value)}</span>
        {target != null && <span className="text-xs text-slate-400">/ {Math.round(target)}</span>}
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
      {target != null && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: accent }} />
        </div>
      )}
    </div>
  );
}
