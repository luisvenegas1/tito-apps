import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { getStravaConnection, syncStrava } from "./stravaApi";
import { getDeviceConnections, syncDevice } from "./deviceApi";

const KEY = "nutricoach.deviceLastSync";
const MIN_INTERVAL = 60 * 60 * 1000; // 1 hora

/**
 * Sincroniza los dispositivos conectados (Strava, Fitbit, Oura) automáticamente
 * al abrir la app, como máximo una vez por hora. Silencioso: si falla o no hay
 * conexión, no muestra nada. La sincronización manual sigue disponible.
 */
export function useStravaAutoSync() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    let last = 0;
    try {
      last = Number(localStorage.getItem(KEY) || 0);
    } catch {
      /* ignore */
    }
    if (Date.now() - last < MIN_INTERVAL) return;

    (async () => {
      let didSomething = false;
      // Strava
      try {
        if (await getStravaConnection(userId)) {
          await syncStrava();
          didSomething = true;
        }
      } catch {
        /* silencioso */
      }
      // Fitbit / Oura
      try {
        const devices = await getDeviceConnections(userId);
        for (const d of devices) {
          try {
            await syncDevice(d.provider);
            didSomething = true;
          } catch {
            /* silencioso */
          }
        }
      } catch {
        /* silencioso */
      }

      if (didSomething) {
        try {
          localStorage.setItem(KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
        qc.invalidateQueries({ queryKey: ["workouts"] });
        qc.invalidateQueries({ queryKey: ["dashboard"] });
        qc.invalidateQueries({ queryKey: ["strava"] });
        qc.invalidateQueries({ queryKey: ["devices"] });
      }
    })();
  }, [userId, qc]);
}
