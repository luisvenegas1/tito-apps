import { requireUserId, supabase } from "@/lib/supabase/client";
import { check } from "@/lib/errors";

/** Convierte la clave VAPID (base64url) al formato que espera pushManager. */
function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return buffer;
}

export function pushSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY);
}

/** Pide permiso, suscribe este dispositivo y lo guarda. */
export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error("Este dispositivo no admite notificaciones. En iPhone, instala la app en la pantalla de inicio primero.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Las notificaciones están bloqueadas para Money Track en este navegador.");
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY) }));
  const json = sub.toJSON();
  const uid = await requireUserId();
  check(
    await supabase
      .from("push_subscriptions")
      .upsert({ user_id: uid, endpoint: sub.endpoint, p256dh: json.keys!.p256dh, auth: json.keys!.auth }, { onConflict: "endpoint" }),
  );
}

export async function disablePush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}
