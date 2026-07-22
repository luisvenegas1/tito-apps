export interface PushSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Convierte la clave VAPID (base64url) al formato que espera pushManager. */
function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);

  for (let i = 0; i < raw.length; i++) {
    out[i] = raw.charCodeAt(i);
  }

  return buffer;
}

export function pushSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * Suscribe el dispositivo a Web Push (si el service worker y la clave VAPID
 * están disponibles) y devuelve la suscripción para guardarla en la BD.
 */
export async function subscribeToPush(): Promise<PushSub | null> {
  if (!pushSupported()) return null;
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!key) return null; // sin clave pública no hay push (queda solo el recordatorio local)

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }
  const json = sub.toJSON();
  if (!json.keys?.p256dh || !json.keys?.auth) return null;
  return { endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
}

export async function unsubscribeFromPush(): Promise<string | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
