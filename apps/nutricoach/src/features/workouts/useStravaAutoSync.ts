import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { getStravaConnection, syncStrava } from "./stravaApi";

const KEY = "nutricoach.stravaLastSync";
const MIN_INTERVAL = 60 * 60 * 1000; // 1 hora

/**
 * Sincroniza Strava automáticamente al abrir la app (si está conectado),
 * como máximo una vez por hora. Silencioso: si falla o no está conectado,
 * no muestra nada. La sincronización manual sigue disponible en la pantalla.
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
      try {
        const conn = await getStravaConnection(userId);
        if (!conn) return; // no conectado
        await syncStrava();
        try {
          localStorage.setItem(KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
        qc.invalidateQueries({ queryKey: ["workouts"] });
        qc.invalidateQueries({ queryKey: ["dashboard"] });
        qc.invalidateQueries({ queryKey: ["strava"] });
      } catch {
        /* silencioso */
      }
    })();
  }, [userId, qc]);
}
