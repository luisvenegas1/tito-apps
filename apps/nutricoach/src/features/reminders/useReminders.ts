import { useEffect } from "react";
import { useDashboard } from "@/features/dashboard/useDashboard";
import { todayISO } from "@/lib/date";
import {
  loadReminders,
  getLastFired,
  setLastFired,
  buildReminderMessage,
  showNotification,
} from "./settings";

/**
 * Programador de recordatorios locales. Mientras la app está abierta (o la PWA
 * instalada en segundo plano en plataformas que lo permiten), revisa cada minuto
 * si llegó la hora configurada y, de ser así, dispara UNA notificación con los
 * faltantes del día. Para entrega con la app totalmente cerrada haría falta Web
 * Push (backend) — ver docs/development.md.
 */
export function useReminders() {
  const { data: dashboard } = useDashboard();

  useEffect(() => {
    const tick = () => {
      const s = loadReminders();
      if (!s.enabled) return;
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (hhmm !== s.time) return;

      const today = todayISO();
      if (getLastFired() === today) return; // ya disparé hoy
      if (!dashboard) return;

      const msg = buildReminderMessage(dashboard, s);
      setLastFired(today); // marcar aunque no haya faltantes, para no repetir
      if (msg) showNotification(msg);
    };

    const id = setInterval(tick, 30_000);
    tick();
    return () => clearInterval(id);
  }, [dashboard]);
}
