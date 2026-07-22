import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Button } from "@titoapps/ui";
import { FlowDiagram, PhoneMock } from "./WearableIllustrations";

type Scene = "sync" | "connect" | "toggle" | "done";
interface Step {
  title: string;
  detail: string;
  scene?: Scene;
}

const AMAZFIT: { device: string; app: string; steps: Step[] } = {
  device: "Amazfit",
  app: "Zepp",
  steps: [
    {
      title: "Abrí la app Zepp",
      detail: "Es la app oficial de Amazfit. Asegurate de que tu reloj esté sincronizado (que tus entrenamientos aparezcan en Zepp).",
      scene: "sync",
    },
    {
      title: "Conectá Zepp con Strava",
      detail: "En Zepp: Perfil → Añadir cuentas (apps de terceros) → Strava → Conectar, y autorizá el acceso.",
      scene: "connect",
    },
    {
      title: "Activá la sincronización automática",
      detail: "Dejá activado el envío de entrenamientos a Strava. Desde ahora, cada actividad de tu Amazfit llega a Strava sola.",
      scene: "toggle",
    },
    {
      title: "Conectá NutriCoach con Strava",
      detail: "Acá en NutriCoach: Entrenamientos → Conectar dispositivo → Strava, y autorizá. Listo: importamos tus entrenamientos.",
      scene: "done",
    },
  ],
};

const APPLE: { device: string; app: string; steps: Step[] } = {
  device: "Apple Watch",
  app: "Salud",
  steps: [
    {
      title: "Tus datos ya están en Salud",
      detail: "El Apple Watch guarda automáticamente los entrenamientos en la app Salud de tu iPhone.",
      scene: "sync",
    },
    {
      title: "Permití que Strava use Salud",
      detail: "Instalá Strava en el iPhone. En Ajustes → Salud → Strava, activá los permisos de actividad y entrenamientos.",
      scene: "toggle",
    },
    {
      title: "Registrá o sincronizá en Strava",
      detail: "Grabá tus entrenamientos con Strava (o dejá que tome los de Salud). Así quedan disponibles por la API de Strava.",
      scene: "connect",
    },
    {
      title: "Conectá NutriCoach con Strava",
      detail: "En NutriCoach: Entrenamientos → Conectar dispositivo → Strava, y autorizá. Tus entrenamientos se importan.",
      scene: "done",
    },
  ],
};

export function ConnectGuidePage() {
  const [tab, setTab] = useState<"amazfit" | "apple">("amazfit");
  const guide = tab === "amazfit" ? AMAZFIT : APPLE;

  return (
    <div className="p-4">
      <PageHeader title="Cómo conectar tu reloj" subtitle="Guía paso a paso" onBack={() => history.back()} />

      <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1">
        {[
          { id: "amazfit", label: "Amazfit" },
          { id: "apple", label: "Apple Watch" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as "amazfit" | "apple")}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium ${
              tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card mt-4">
        <div className="metric-label mb-2">El recorrido de tus datos</div>
        <FlowDiagram deviceLabel={guide.device} appLabel={guide.app} />
        <p className="mt-1 text-xs text-slate-400">
          {guide.device} no se conecta directo a la web; pasa por {guide.app} → Strava → NutriCoach.
        </p>
      </div>

      <ol className="mt-4 space-y-4">
        {guide.steps.map((s, i) => (
          <li key={i} className="card">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="font-semibold text-slate-800">{s.title}</div>
                <p className="mt-1 text-sm text-slate-500">{s.detail}</p>
              </div>
            </div>
            {s.scene && (
              <div className="mt-3 flex justify-center rounded-xl bg-slate-50 py-4">
                <PhoneMock scene={s.scene} caption={s.title} />
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        Nota: las ilustraciones son de referencia. La conexión con Strava estará disponible cuando se
        active el acceso (requiere configurar las credenciales de Strava). Fitbit puede conectarse directo.
      </div>

      <Link to="/workouts/connect" className="mt-4 block">
        <Button className="w-full">Ir a conectar dispositivo</Button>
      </Link>
    </div>
  );
}
