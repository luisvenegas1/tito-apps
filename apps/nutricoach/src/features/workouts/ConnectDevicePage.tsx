import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Button, Spinner } from "@titoapps/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { getStravaConnection, stravaAuthUrl, syncStrava, disconnectStrava } from "./stravaApi";

/**
 * Conectar dispositivos. La vía real es Strava: Amazfit (vía Zepp) y Apple Watch
 * (vía Salud) sincronizan a Strava, y NutriCoach importa desde ahí.
 */
export function ConnectDevicePage() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  const conn = useQuery({
    queryKey: ["strava", "connection"],
    queryFn: () => getStravaConnection(userId!),
    enabled: !!userId,
  });

  const sync = useMutation({
    mutationFn: syncStrava,
    onSuccess: (n) => {
      setMsg(n > 0 ? `Importamos ${n} entrenamiento(s) nuevo(s). 💪` : "Ya estás al día, no hay nada nuevo.");
      qc.invalidateQueries({ queryKey: ["workouts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["strava"] });
    },
    onError: (e) => setMsg(e instanceof Error ? e.message : "No se pudo sincronizar."),
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectStrava(userId!),
    onSuccess: () => {
      setMsg(null);
      qc.invalidateQueries({ queryKey: ["strava"] });
    },
  });

  const connected = !!conn.data;
  const hasClientId = !!import.meta.env.VITE_STRAVA_CLIENT_ID;

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

      {/* Tarjeta principal de Strava */}
      <div className="mt-4 card">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-800">🟠 Strava</span>
          {conn.isLoading ? (
            <Spinner />
          ) : (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                connected ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {connected ? "Conectado" : "No conectado"}
            </span>
          )}
        </div>

        {!connected ? (
          <>
            {hasClientId ? (
              <a href={stravaAuthUrl()} className="mt-3 block">
                <Button className="w-full">Conectar con Strava</Button>
              </a>
            ) : (
              <p className="mt-3 text-xs text-amber-600">
                Falta configurar la app de Strava (VITE_STRAVA_CLIENT_ID). Avisá al administrador.
              </p>
            )}
          </>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-400">
              {conn.data?.last_synced_at
                ? `Última sincronización: ${new Date(conn.data.last_synced_at).toLocaleString()}`
                : "Aún no sincronizaste."}
            </p>
            <Button className="w-full" onClick={() => sync.mutate()} disabled={sync.isPending}>
              {sync.isPending ? "Sincronizando…" : "Sincronizar ahora"}
            </Button>
            <button
              onClick={() => disconnect.mutate()}
              disabled={disconnect.isPending}
              className="w-full text-center text-sm text-red-400 underline"
            >
              Desconectar Strava
            </button>
          </div>
        )}
        {msg && <p className="mt-3 text-sm text-slate-600">{msg}</p>}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Consejo: hacé un entrenamiento con tu reloj, esperá a que aparezca en Strava y tocá “Sincronizar ahora”.
      </p>

      <div className="mt-6 card text-center">
        <p className="text-sm text-slate-600">También podés anotar un entrenamiento a mano.</p>
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
