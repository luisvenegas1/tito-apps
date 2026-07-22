interface Props {
  values: number[];
  target?: number | null;
  color?: string;
  height?: number;
}

/**
 * Mini gráfico de barras (SVG puro, sin librerías). Muestra una serie diaria
 * con una línea de meta opcional. Las barras que superan la meta se pintan ámbar.
 */
export function BarTrend({ values, target, color = "#16a34a", height = 120 }: Props) {
  const max = Math.max(target ?? 0, ...values, 1);
  const n = values.length;
  const gap = 2;
  const W = 300;
  const barW = (W - gap * (n - 1)) / n;
  const y = (v: number) => height - (v / max) * height;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="Tendencia diaria">
      {target != null && target > 0 && (
        <line x1={0} y1={y(target)} x2={W} y2={y(target)} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 3" />
      )}
      {values.map((v, i) => {
        const h = v > 0 ? Math.max(2, height - y(v)) : 0;
        const over = target != null && target > 0 && v > target * 1.1;
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={height - h}
            width={barW}
            height={h}
            rx={1.5}
            fill={over ? "#f59e0b" : color}
            opacity={v > 0 ? 0.9 : 0.15}
          />
        );
      })}
    </svg>
  );
}
