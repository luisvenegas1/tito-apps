import { formatMoney } from "@/lib/money";
import type { Currency } from "@/lib/supabase/types";

/** Barras horizontales con etiqueta: ranking por categoría. */
export function BarList({
  items,
  currency,
  max = 6,
}: {
  items: { label: string; icon?: string | null; value: number }[];
  currency: Currency;
  max?: number;
}) {
  const shown = items.slice(0, max);
  const top = Math.max(...shown.map((i) => i.value), 1);
  const total = items.reduce((a, i) => a + i.value, 0) || 1;
  return (
    <ul className="space-y-3">
      {shown.map((i) => (
        <li key={i.label}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate">
              {i.icon && <span aria-hidden className="mr-1.5">{i.icon}</span>}
              {i.label}
            </span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold">{formatMoney(i.value, currency)}</span>
              <span className="ml-2 text-muted">{Math.round((i.value / total) * 100)}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-surface-subtle">
            <div className="h-2 rounded-full bg-teal" style={{ width: `${(i.value / top) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Barras por mes: entra (esmeralda) vs. sale (navy/gris), con el mes actual resaltado.
 * SVG propio: liviano y legible en claro y oscuro.
 */
export function MonthBars({
  data,
  currency,
  highlight,
  outflowOnly,
}: {
  data: { label: string; key: string; income: number; outflow: number }[];
  currency: Currency;
  highlight?: string;
  /** Solo una serie (p. ej. gasto de una categoría): barras más anchas y sin leyenda. */
  outflowOnly?: boolean;
}) {
  const W = 320, H = 132, pad = 18;
  const max = Math.max(...data.flatMap((d) => [d.income, d.outflow]), 1);
  const slot = (W - pad * 2) / data.length;
  const bw = outflowOnly ? Math.min(20, slot / 2) : Math.min(14, slot / 3);
  const y = (v: number) => H - 22 - (v / max) * (H - 34);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Ingresos y gastos por mes">
        {data.map((d, i) => {
          const cx = pad + slot * i + slot / 2;
          const on = d.key === highlight;
          return (
            <g key={d.key}>
              <title>{`${d.label}: entró ${formatMoney(d.income, currency)}, salió ${formatMoney(d.outflow, currency)}`}</title>
              {!outflowOnly && <rect x={cx - bw - 1} y={y(d.income)} width={bw} height={H - 22 - y(d.income)} rx={3} fill="#10B981" opacity={on ? 1 : 0.55} />}
              <rect x={outflowOnly ? cx - bw / 2 : cx + 1} y={y(d.outflow)} width={bw} height={H - 22 - y(d.outflow)} rx={3} className="fill-slate-700 dark:fill-slate-400" opacity={on ? 1 : 0.45} />
              <text x={cx} y={H - 6} textAnchor="middle" className="fill-current text-[10px]" opacity={on ? 1 : 0.6} fontWeight={on ? 700 : 500}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {!outflowOnly && <figcaption className="mt-2 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Entró</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-slate-700 dark:bg-slate-400" /> Salió de tu bolsillo</span>
      </figcaption>}
    </figure>
  );
}

export function Progress({ value, tone = "ok" }: { value: number; tone?: "ok" | "warn" | "over" }) {
  const color = tone === "over" ? "bg-deficit" : tone === "warn" ? "bg-warning" : "bg-emerald-600";
  return (
    <div className="h-2.5 rounded-full bg-surface-subtle" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}
