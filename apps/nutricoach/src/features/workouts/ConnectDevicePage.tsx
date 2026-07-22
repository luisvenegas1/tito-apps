import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, PageHeader } from "@titoapps/ui";
import { PROVIDERS, MockWearableProvider, dedupeByExternalId } from "@titoapps/health";
import { useAuth } from "@/features/auth/AuthProvider";
import { useImportWorkouts, useWorkouts } from "@/features/health/useHealth";

/**
 * Conexión de dispositivos de salud. Los proveedores reales (Apple/Google/
 * Garmin/Fitbit/Amazfit) requieren OAuth/SDK y se implementan cuando estén
 * disponibles; la arquitectura (`@titoapps/health`) ya deja el seam listo.
 * El botón de demo prueba el pipeline completo de importación + dedupe.
 */
export function ConnectDevicePage() {
  const { session } = useAuth();
  const importer = useImportWorkouts();
  const { data: existing = [] } = useWorkouts(60);
  const [result, setResult] = useState<string | null>(null);

  const runDemo = async () => {
    setResult(null);
    const provider = new MockWearableProvider();
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const incoming = await provider.listWorkouts(since);
    // Dedupe contra lo ya importado (evita duplicar al re-sincronizar).
    const existingIds = existing.map((w) => w.external_id).filter((x): x is string => !!x);
    const toImport = dedupeByExternalId(incoming, existingIds);
    if (toImport.length === 0) {
      setResult("Todo al día: no hay entrenamientos nuevos para importar.");
      return;
    }
    const n = await importer.mutateAsync(toImport);
    setResult(`Importados ${n} entrenamiento(s) desde el wearable de demo.`);
  };

  return (
    <div className="p-4">
      <PageHeader title="Conectar dispositivo" subtitle="Sincronizá tu actividad" />

      <p className="mt-4 text-sm text-slate-500">
        Conectá una fuente de salud para importar tus entrenamientos automáticamente.
      </p>

      <div className="mt-3 card bg-sky-50/60 text-sm text-slate-600">
        <b className="text-slate-800">Amazfit y Apple Watch</b> no ofrecen una API directa para la web.
        Se conectan a través de <b>Strava</b>: sincronizás tu reloj con la app (Zepp o Salud) y de ahí a
        Strava, y NutriCoach importa desde Strava. Un solo enlace cubre ambos dispositivos.
      </div>

      <Link
        to="/workouts/connect/guide"
        className="mt-3 flex items-center justify-between rounded-xl bg-green-50 p-3 active:scale-[.98]"
      >
        <span className="text-sm font-semibold text-green-800">📖 Ver guía paso a paso (con ilustraciones)</span>
        <span className="text-green-600">→</span>
      </Link>

      <ul className="mt-4 space-y-2">
        {PROVIDERS.map((p) => (
          <li key={p.id} className="card flex items-center justify-between">
            <span className="font-medium text-slate-800">{p.label}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {p.available ? "Disponible" : "Próximamente"}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 card">
        <div className="metric-label mb-1">Demo de importación</div>
        <p className="mb-3 text-xs text-slate-400">
          Prueba el pipeline real (normalización → dedupe → guardado) con datos de ejemplo, sin OAuth.
        </p>
        <Button className="w-full" onClick={runDemo} disabled={importer.isPending || !session}>
          {importer.isPending ? "Importando…" : "Importar de wearable (demo)"}
        </Button>
        {result && <p className="mt-3 text-sm text-green-700">{result}</p>}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Arquitectura: cada proveedor implementa <code>HealthProvider</code> en <code>@titoapps/health</code> y
        mapea con los adapters puros. La deduplicación usa <code>source + external_id</code>.
      </p>
    </div>
  );
}
