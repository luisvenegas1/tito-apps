import { useEffect, useState } from "react";
import { Button } from "@titoapps/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDashboard } from "@/features/dashboard/useDashboard";
import {
  loadReminders,
  saveReminders,
  buildReminderMessage,
  showNotification,
  type ReminderSettings,
} from "./settings";
import { subscribeToPush, unsubscribeFromPush, pushSupported } from "./push";
import { getReminderConfig, saveReminderConfig, savePushSubscription, removePushSubscription } from "./api";

/** Ajustes de recordatorios (agua, proteína, calorías) con Web Push. */
export function RemindersCard() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: dashboard } = useDashboard();
  const [s, setS] = useState<ReminderSettings>(() => loadReminders());
  const [msg, setMsg] = useState<string | null>(null);
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);

  const supported = typeof Notification !== "undefined";

  // Cargar config desde la BD (fuente de verdad para el push).
  useEffect(() => {
    if (!userId) return;
    getReminderConfig(userId)
      .then((c) => {
        if (!c) return;
        const next: ReminderSettings = {
          enabled: c.reminder_enabled,
          time: c.reminder_time?.slice(0, 5) || "18:00",
          water: c.reminder_water,
          protein: c.reminder_protein,
          calories: c.reminder_calories,
        };
        setS(next);
        saveReminders(next);
      })
      .catch(() => {});
  }, [userId]);

  const persist = (next: ReminderSettings) => {
    setS(next);
    saveReminders(next); // para el programador local (app abierta)
    if (userId) saveReminderConfig(userId, next).catch(() => {});
  };

  const update = (patch: Partial<ReminderSettings>) => persist({ ...s, ...patch });

  const enable = async () => {
    if (!supported) {
      setMsg("Tu navegador no soporta notificaciones.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      let perm = Notification.permission;
      if (perm === "default") perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMsg("Activá los permisos de notificación del navegador para recibir recordatorios.");
        return;
      }
      persist({ ...s, enabled: true });
      // Intentar Web Push (para que lleguen con la app cerrada).
      if (pushSupported() && userId) {
        try {
          const sub = await subscribeToPush();
          if (sub) {
            await savePushSubscription(userId, sub);
            setPushOn(true);
          }
        } catch {
          /* sin push: quedan los recordatorios locales */
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    persist({ ...s, enabled: false });
    setPushOn(false);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await removePushSubscription(endpoint);
    } catch {
      /* ignore */
    }
  };

  const test = () => {
    if (!dashboard) return;
    const text = buildReminderMessage(dashboard, s) ?? "¡Vas al día con tus metas! 🎉";
    if (Notification?.permission === "granted") showNotification(text);
    setMsg(`Ejemplo: "${text}"`);
  };

  const Toggle = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ring-1 ${
        on ? "bg-green-50 text-green-800 ring-green-200" : "bg-white text-slate-600 ring-slate-200"
      }`}
    >
      <span>{label}</span>
      <span className={`h-4 w-4 rounded-full ${on ? "bg-green-600" : "bg-slate-300"}`} />
    </button>
  );

  return (
    <div className="card space-y-3">
      <div>
        <h2 className="font-semibold text-slate-800">Recordatorios</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          A la hora que elijas, te avisamos si te falta agua, proteína o calorías para tu meta del día.
        </p>
      </div>

      {!s.enabled ? (
        <Button className="w-full" onClick={enable} disabled={busy}>
          {busy ? "Activando…" : "Activar recordatorios"}
        </Button>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <label className="label mb-0">Hora del recordatorio</label>
            <input
              type="time"
              value={s.time}
              onChange={(e) => update({ time: e.target.value })}
              className="input w-32"
            />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Toggle on={s.water} label="Agua 💧" onClick={() => update({ water: !s.water })} />
            <Toggle on={s.protein} label="Proteína 🍗" onClick={() => update({ protein: !s.protein })} />
            <Toggle on={s.calories} label="Calorías 🔥" onClick={() => update({ calories: !s.calories })} />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={test}>
              Probar ahora
            </Button>
            <Button variant="ghost" className="flex-1" onClick={disable}>
              Desactivar
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            {pushOn
              ? "Notificaciones activas — también llegan con la app cerrada."
              : "Se avisarán con la app abierta. Para recibirlas con la app cerrada, instalá la app y activá el push (requiere configurar VAPID)."}
          </p>
        </>
      )}

      {msg && <p className="text-sm text-slate-500">{msg}</p>}
    </div>
  );
}
