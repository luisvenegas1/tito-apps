import { Link } from "react-router-dom";
import { PageHeader } from "@titoapps/ui";
import { PROVIDERS } from "@titoapps/health";

/**
 * Conexión de dispositivos de salud (wearables). La conexión real con cada
 * proveedor requiere autorización (OAuth) y se irá habilitando; por ahora se
 * explica el camino y se puede registrar la actividad a mano.
 */
export function ConnectDevicePage() {
  return (
    <div className="p-4">
      <PageHeader title="Conectar dispositivo" subtitle="Sincronizá tu actividad" onBack={() => history.back()} />

      <p className="mt-4 text-sm text-slate-500">
        Conectá tu reloj o pulsera para que tus entrenamientos y las calorías que quemás se anoten solos.
      </p>

      <div className="mt-3 card bg-sky-50/60 text-sm text-slate-600">
        <b className="text-slate-800">Amazfit y Apple Watch</b> se conectan a través de <b>Strava</b>: sincronizás
        tu reloj con su app (Zepp o Salud) y de ahí a Strava, y NutriCoach toma tus entrenamientos desde Strava.
        Un solo enlace cubre ambos.
      </div>

      <Link
        to="/workouts/connect/guide"
        className="mt-3 flex items-center justify-between rounded-xl bg-green-50 p-3 active:scale-[.98]"
      >
        <span className="text-sm font-semibold text-green-800">📖 Ver guía paso a paso (con ilustraciones)</span>
        <span className="text-green-600">→</span>
      </Link>

      <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-500">Dispositivos y apps</h3>
      <ul className="space-y-2">
        {PROVIDERS.map((p) => (
          <li key={p.id} className="card flex items-center justify-between">
            <span className="font-medium text-slate-800">{p.label}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {p.available ? "Disponible" : "Próximamente"}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 card text-center">
        <p className="text-sm text-slate-600">
          Mientras habilitamos la conexión automática, podés anotar tus entrenamientos a mano.
        </p>
        <Link
          to="/workouts"
          className="mt-3 inline-block rounded-token bg-primary px-4 py-2.5 font-semibold text-primary-contrast active:scale-[.98]"
        >
          Registrar un entrenamiento
        </Link>
      </div>
    </div>
  );
}
