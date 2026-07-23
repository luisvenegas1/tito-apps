import { supabase } from "@/lib/supabase/client";
import type { DeviceConnection, DeviceProvider } from "@/lib/supabase/types";

export interface DeviceMeta {
  id: DeviceProvider;
  label: string;
  emoji: string;
  authorizeBase: string;
  scope: string;
  clientId: string;
}

/**
 * Proveedores de dispositivos con OAuth propio (además de Strava).
 *
 * NOTA sobre Fitbit: su API vieja (api.fitbit.com) se deprecó y migró a la
 * "Google Health API" (Google Cloud + Google OAuth), que se apaga la vieja en
 * sep-2026. Implementarlo hoy requiere la Google Health API completa (con
 * verificación de Google). Se deja fuera de la lista hasta implementarlo.
 */
export const DEVICE_PROVIDERS: DeviceMeta[] = [
  {
    id: "oura",
    label: "Oura Ring",
    emoji: "💍",
    authorizeBase: "https://cloud.ouraring.com/oauth/authorize",
    scope: "workout daily",
    clientId: import.meta.env.VITE_OURA_CLIENT_ID ?? "",
  },
];

export function deviceRedirectUri(): string {
  return `${window.location.origin}/connect/callback`;
}

/** URL de autorización del proveedor. El `state` lleva el id para el callback. */
export function deviceAuthUrl(p: DeviceMeta): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: p.clientId,
    redirect_uri: deviceRedirectUri(),
    scope: p.scope,
    state: p.id,
  });
  return `${p.authorizeBase}?${params.toString()}`;
}

export async function getDeviceConnections(userId: string): Promise<DeviceConnection[]> {
  const { data, error } = await supabase
    .from("device_connections")
    .select("user_id, provider, last_synced_at")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data as DeviceConnection[]) ?? [];
}

export async function exchangeDeviceCode(provider: DeviceProvider, code: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("device-exchange", {
    body: { provider, code, redirect_uri: deviceRedirectUri() },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

export async function syncDevice(provider: DeviceProvider): Promise<number> {
  const { data, error } = await supabase.functions.invoke("device-sync", { body: { provider } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data?.imported ?? 0;
}

export async function disconnectDevice(userId: string, provider: DeviceProvider): Promise<void> {
  const { error } = await supabase
    .from("device_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) throw new Error(error.message);
}
