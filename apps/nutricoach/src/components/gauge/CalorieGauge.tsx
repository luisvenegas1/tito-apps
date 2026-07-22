import { gaugeZone, type GaugeZone } from "@titoapps/nutrition";

interface Props {
  consumed: number;
  target: number;
}

const ZONE_COLOR: Record<GaugeZone, string> = {
  green: "#16a34a",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
};

const ZONE_LABEL: Record<GaugeZone, string> = {
  green: "Vas muy bien",
  yellow: "Buen ritmo",
  orange: "Cerca de la meta",
  red: "Meta superada",
};

// Geometría del semicírculo.
const R = 120;
const CX = 140;
const CY = 140;
const STROKE = 22;

function polar(angleDeg: number, radius = R): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
}

// Arco de 180° a 360° (semicírculo superior), izquierda→derecha.
function arcPath(fromPct: number, toPct: number): string {
  const a0 = 180 + fromPct * 180;
  const a1 = 180 + toPct * 180;
  const [x0, y0] = polar(a0);
  const [x1, y1] = polar(a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}`;
}

/**
 * Velocímetro semicircular de calorías.
 * Arranca 100% verde y la aguja avanza verde→amarillo→naranja→rojo según
 * el porcentaje de la meta consumido. SVG puro (sin librería de charts).
 */
export function CalorieGauge({ consumed, target }: Props) {
  const pct = target > 0 ? consumed / target : 0;
  const clamped = Math.max(0, Math.min(pct, 1.15));
  const zone = gaugeZone(pct);
  const color = ZONE_COLOR[zone];
  const remaining = Math.round(target - consumed);

  // Segmentos de fondo (referencia de zonas).
  const segments: Array<[number, number, GaugeZone]> = [
    [0, 0.7, "green"],
    [0.7, 0.9, "yellow"],
    [0.9, 1, "orange"],
    [1, 1, "red"],
  ];

  // Aguja.
  const needleAngle = 180 + Math.min(clamped, 1) * 180;
  const [nx, ny] = polar(needleAngle, R - STROKE);

  return (
    <div
      className="relative flex flex-col items-center"
      role="img"
      aria-label={`Calorías: ${Math.round(consumed)} de ${target}. ${remaining >= 0 ? `${remaining} restantes` : `${-remaining} de exceso`}. ${ZONE_LABEL[zone]}.`}
    >
      <svg viewBox="0 0 280 170" className="w-full max-w-xs">
        {/* Fondo gris */}
        <path d={arcPath(0, 1)} fill="none" stroke="#e2e8f0" strokeWidth={STROKE} strokeLinecap="round" />
        {/* Segmentos de zona (tenues) */}
        {segments
          .filter(([a, b]) => b > a)
          .map(([a, b, z]) => (
            <path
              key={z}
              d={arcPath(a, b)}
              fill="none"
              stroke={ZONE_COLOR[z]}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              opacity={0.18}
            />
          ))}
        {/* Progreso activo */}
        <path
          d={arcPath(0, Math.min(clamped, 1))}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          style={{ transition: "stroke 0.4s, d 0.4s" }}
        />
        {/* Aguja */}
        <line x1={CX} y1={CY} x2={nx} y2={ny} stroke={color} strokeWidth={4} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={7} fill={color} />
      </svg>

      {/* Centro: consumidas / meta / restantes */}
      <div className="-mt-16 flex flex-col items-center">
        <span className="text-4xl font-extrabold tabular-nums text-slate-900">
          {Math.round(consumed)}
        </span>
        <span className="text-xs text-slate-400">de {target} kcal</span>
        <span
          className={`mt-1 text-sm font-semibold ${remaining >= 0 ? "text-slate-600" : "text-red-600"}`}
        >
          {remaining >= 0 ? `${remaining} restantes` : `${-remaining} de exceso`}
        </span>
      </div>
    </div>
  );
}
