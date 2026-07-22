/**
 * Ilustraciones SVG propias (no capturas de terceros) para la guía de conexión
 * de wearables. Puramente decorativas + explicativas; se pueden reemplazar por
 * capturas reales más adelante.
 */

/** Diagrama del flujo: Reloj → App del reloj → Strava → NutriCoach. */
export function FlowDiagram({ deviceLabel = "Amazfit", appLabel = "Zepp" }: { deviceLabel?: string; appLabel?: string }) {
  const nodes = [
    { icon: "⌚", label: deviceLabel },
    { icon: "📱", label: appLabel },
    { icon: "🟠", label: "Strava" },
    { icon: "🥗", label: "NutriCoach" },
  ];
  return (
    <svg viewBox="0 0 340 96" className="w-full" role="img" aria-label={`Flujo: ${nodes.map((n) => n.label).join(" a ")}`}>
      {nodes.map((n, i) => {
        const x = 20 + i * 100;
        return (
          <g key={i}>
            {i < nodes.length - 1 && (
              <line x1={x + 34} y1={40} x2={x + 66} y2={40} stroke="#cbd5e1" strokeWidth={2} markerEnd="url(#arrow)" />
            )}
            <circle cx={x + 8} cy={40} r={22} fill="#f0fdf4" stroke="#16a34a" strokeWidth={1.5} />
            <text x={x + 8} y={46} fontSize={20} textAnchor="middle">{n.icon}</text>
            <text x={x + 8} y={82} fontSize={11} fontWeight={600} textAnchor="middle" fill="#334155">{n.label}</text>
          </g>
        );
      })}
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
        </marker>
      </defs>
    </svg>
  );
}

type Scene = "sync" | "connect" | "toggle" | "done";

/** Mockup de teléfono con una escena simple que ilustra el paso. */
export function PhoneMock({ scene, caption }: { scene: Scene; caption: string }) {
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 200" className="h-40" role="img" aria-label={caption}>
        {/* Cuerpo del teléfono */}
        <rect x="8" y="4" width="124" height="192" rx="18" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
        <rect x="54" y="10" width="32" height="5" rx="2.5" fill="#e2e8f0" />
        {/* Pantalla */}
        <rect x="16" y="22" width="108" height="166" rx="10" fill="#f8fafc" />
        <SceneContent scene={scene} />
      </svg>
      <p className="mt-2 max-w-[16rem] text-center text-xs text-slate-500">{caption}</p>
    </div>
  );
}

function SceneContent({ scene }: { scene: Scene }) {
  switch (scene) {
    case "sync":
      return (
        <g>
          <circle cx="70" cy="80" r="26" fill="none" stroke="#16a34a" strokeWidth="4" strokeDasharray="90 40" />
          <path d="M70 54 l7 8 l-14 0 z" fill="#16a34a" />
          <text x="70" y="130" fontSize="11" textAnchor="middle" fill="#475569">Sincronizando…</text>
        </g>
      );
    case "connect":
      return (
        <g>
          <text x="70" y="60" fontSize="22" textAnchor="middle">🟠</text>
          <rect x="34" y="96" width="72" height="26" rx="13" fill="#16a34a" />
          <text x="70" y="113" fontSize="11" fontWeight="700" textAnchor="middle" fill="#ffffff">Conectar</text>
          <text x="70" y="150" fontSize="10" textAnchor="middle" fill="#94a3b8">Autorizar acceso</text>
        </g>
      );
    case "toggle":
      return (
        <g>
          <text x="30" y="76" fontSize="11" fill="#334155">Strava</text>
          <rect x="86" y="66" width="34" height="18" rx="9" fill="#16a34a" />
          <circle cx="111" cy="75" r="7" fill="#ffffff" />
          <text x="30" y="112" fontSize="11" fill="#334155">Apple Health</text>
          <rect x="86" y="102" width="34" height="18" rx="9" fill="#16a34a" />
          <circle cx="111" cy="111" r="7" fill="#ffffff" />
        </g>
      );
    case "done":
      return (
        <g>
          <circle cx="70" cy="82" r="24" fill="#16a34a" />
          <path d="M59 82 l8 8 l16 -18" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="70" y="132" fontSize="11" textAnchor="middle" fill="#475569">¡Conectado!</text>
        </g>
      );
  }
}
