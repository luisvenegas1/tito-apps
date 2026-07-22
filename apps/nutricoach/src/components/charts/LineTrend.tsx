interface Point {
  x: string;
  y: number;
}
interface Props {
  points: Point[];
  color?: string;
  height?: number;
}

/** Mini gráfico de línea (SVG puro) para tendencias como el peso. */
export function LineTrend({ points, color = "#0ea5e9", height = 120 }: Props) {
  if (points.length < 2) {
    return <p className="py-6 text-center text-sm text-slate-400">Registrá al menos dos puntos para ver la tendencia.</p>;
  }
  const W = 300;
  const ys = points.map((p) => p.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const px = (i: number) => (i / (points.length - 1)) * W;
  const py = (v: number) => height - 8 - ((v - min) / span) * (height - 16);

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(p.y).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Tendencia de peso">
      <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={px(i)} cy={py(p.y)} r={2.5} fill={color} />
      ))}
      <text x={0} y={12} fontSize={10} fill="#94a3b8">{max.toFixed(1)}</text>
      <text x={0} y={height - 2} fontSize={10} fill="#94a3b8">{min.toFixed(1)}</text>
    </svg>
  );
}
