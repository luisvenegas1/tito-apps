import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Spinner } from "@titoapps/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  DEVICE_PROVIDERS,
  deviceAuthUrl,
  getDeviceConnections,
  syncDevice,
  disconnectDevice,
  type DeviceMeta,
} from "./deviceApi";
import type { DeviceProvider } from "@/lib/supabase/types";

/** Tarjetas de dispositivos con OAuth propio (Fitbit, Oura). */
export function DeviceCards() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  const [msg, setMsg] = useState<Record<string, string>>({});

  const conns = useQuery({
    queryKey: ["devices", "connections"],
    queryFn: () => getDeviceConnections(userId!),
    enabled: !!userId,
  });

  const sync = useMutation({
    mutationFn: (p: DeviceProvider) => syncDevice(p),
    onSuccess: (n, p) => {
      setMsg((m) => ({ ...m, [p]: n > 0 ? `Importamos ${n} entrenamiento(s). 💪` : "Ya estás al día." }));
      qc.invalidateQueries({ queryKey: ["workouts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (e, p) => setMsg((m) => ({ ...m, [p]: e instanceof Error ? e.message : "No se pudo sincronizar." })),
  });

  const disconnect = useMutation({
    mutationFn: (p: DeviceProvider) => disconnectDevice(userId!, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });

  const isConnected = (id: DeviceProvider) => (conns.data ?? []).some((c) => c.provider === id);
  const lastSync = (id: DeviceProvider) => (conns.data ?? []).find((c) => c.provider === id)?.last_synced_at;

  const Card = ({ p }: { p: DeviceMeta }) => {
    const connected = isConnected(p.id);
    return (
      <div className="card">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-800">
            {p.emoji} {p.label}
          </span>
          {conns.isLoading ? (
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
          p.clientId ? (
            <Button className="mt-3 w-full" onClick={() => window.location.replace(deviceAuthUrl(p))}>
              Conectar con {p.label}
            </Button>
          ) : (
            <p className="mt-3 text-xs text-slate-400">Próximamente (falta configurar {p.label}).</p>
          )
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-400">
              {lastSync(p.id) ? `Última sincronización: ${new Date(lastSync(p.id)!).toLocaleString()}` : "Aún no sincronizaste."}
            </p>
            <Button className="w-full" onClick={() => sync.mutate(p.id)} disabled={sync.isPending}>
              {sync.isPending ? "Sincronizando…" : "Sincronizar ahora"}
            </Button>
            <button
              onClick={() => disconnect.mutate(p.id)}
              disabled={disconnect.isPending}
              className="w-full text-center text-sm text-red-400 underline"
            >
              Desconectar {p.label}
            </button>
          </div>
        )}
        {msg[p.id] && <p className="mt-2 text-sm text-slate-600">{msg[p.id]}</p>}
      </div>
    );
  };

  return (
    <div className="mt-3 space-y-3">
      {DEVICE_PROVIDERS.map((p) => (
        <Card key={p.id} p={p} />
      ))}
    </div>
  );
}
