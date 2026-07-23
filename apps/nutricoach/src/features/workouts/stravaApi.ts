import { supabase } from "@/lib/supabase/client";
import type { StravaConnection } from "@/lib/supabase/types";

/** URL de autorización de Strava. El usuario acepta y Strava vuelve a /strava/callback. */
export function stravaAuthUrl(): string {
  const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
  const redirectUri = `${window.location.origin}/strava/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

/** ¿El usuario ya conectó Strava? Devuelve la conexión (sin tokens) o null. */
export async function getStravaConnection(userId: string): Promise<StravaConnection | null> {
  const { data, error } = await supabase
    .from("strava_connections")
    .select("user_id, athlete_id, last_synced_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StravaConnection) ?? null;
}

/** Canjea el código de OAuth por tokens (server-side). */
export async function exchangeStravaCode(code: string): Promise<{ athlete_id: number | null }> {
  const { data, error } = await supabase.functions.invoke("strava-exchange", { body: { code } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return { athlete_id: data?.athlete_id ?? null };
}

/** Trae los entrenamientos recientes desde Strava. Devuelve cuántos importó. */
export async function syncStrava(): Promise<number> {
  const { data, error } = await supabase.functions.invoke("strava-sync", { body: {} });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data?.imported ?? 0;
}

/** Desconecta Strava (borra la conexión local). */
export async function disconnectStrava(userId: string): Promise<void> {
  const { error } = await supabase.from("strava_connections").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}
