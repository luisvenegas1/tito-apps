// Lógica multi-proveedor de dispositivos (Fitbit, Oura). Usada por
// device-exchange y device-sync. Cada proveedor: OAuth + refresh + workouts.
// deno-lint-ignore-file no-explicit-any

export type Provider = "fitbit" | "oura" | "google";

/** Fuente (workouts.source) que corresponde a cada proveedor. */
export function sourceFor(provider: Provider): string {
  return provider === "google" ? "google_health" : provider;
}

export interface TokenSet {
  access_token: string;
  refresh_token: string | null;
  expires_at: string; // ISO
  external_user_id: string | null;
}

export interface WorkoutRow {
  type: string;
  name: string | null;
  duration_min: number;
  kcal_burned: number;
  external_id: string;
  performed_at: string;
}

const MET: Record<string, number> = {
  walking: 3.5, running: 9.8, cycling: 7.5, swimming: 8, strength: 6,
  hiit: 8.5, yoga: 3, elliptical: 5, rowing: 7, other: 4,
};

export function normalizeType(raw: string): string {
  const s = (raw || "").toLowerCase();
  if (/run|jog|treadmill/.test(s)) return "running";
  if (/walk|hik/.test(s)) return "walking";
  if (/ride|cycl|bike|spinning/.test(s)) return "cycling";
  if (/swim/.test(s)) return "swimming";
  if (/weight|strength|workout|gym/.test(s)) return "strength";
  if (/hiit|interval/.test(s)) return "hiit";
  if (/yoga|pilates/.test(s)) return "yoga";
  if (/elliptical/.test(s)) return "elliptical";
  if (/row/.test(s)) return "rowing";
  return "other";
}

function estimate(type: string, minutes: number, weightKg: number): number {
  return Math.round((((MET[type] ?? 4) * 3.5 * weightKg) / 200) * minutes);
}

function creds(provider: Provider): { id: string; secret: string } {
  const p = provider.toUpperCase();
  return { id: Deno.env.get(`${p}_CLIENT_ID`) ?? "", secret: Deno.env.get(`${p}_CLIENT_SECRET`) ?? "" };
}

function toTokenSet(provider: Provider, t: any): TokenSet {
  return {
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? null,
    expires_at: new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString(),
    external_user_id: provider === "fitbit" ? (t.user_id ? String(t.user_id) : null) : null,
  };
}

// Token endpoint OAuth de Google (Google Health API usa Google OAuth 2.0 estándar).
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";

// ---------- OAuth ----------
export async function exchangeCode(provider: Provider, code: string, redirectUri: string): Promise<TokenSet> {
  const { id, secret } = creds(provider);
  if (provider === "google") {
    const res = await fetch(GOOGLE_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: id,
        client_secret: secret,
      }),
    });
    if (!res.ok) throw new Error(`Google token ${res.status}: ${await res.text()}`);
    return toTokenSet(provider, await res.json());
  }
  if (provider === "fitbit") {
    const res = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${id}:${secret}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: id }),
    });
    if (!res.ok) throw new Error(`Fitbit token ${res.status}: ${await res.text()}`);
    return toTokenSet(provider, await res.json());
  }
  // oura
  const res = await fetch("https://api.ouraring.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: id,
      client_secret: secret,
    }),
  });
  if (!res.ok) throw new Error(`Oura token ${res.status}: ${await res.text()}`);
  return toTokenSet(provider, await res.json());
}

export async function refreshToken(provider: Provider, refresh: string): Promise<TokenSet> {
  const { id, secret } = creds(provider);
  if (provider === "google") {
    const res = await fetch(GOOGLE_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refresh,
        client_id: id,
        client_secret: secret,
      }),
    });
    if (!res.ok) throw new Error(`Google refresh ${res.status}`);
    const t = await res.json();
    // Google no siempre reenvía refresh_token en el refresh: conservamos el actual.
    return { ...toTokenSet(provider, t), refresh_token: t.refresh_token ?? refresh };
  }
  if (provider === "fitbit") {
    const res = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${id}:${secret}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
    });
    if (!res.ok) throw new Error(`Fitbit refresh ${res.status}`);
    return toTokenSet(provider, await res.json());
  }
  const res = await fetch("https://api.ouraring.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh, client_id: id, client_secret: secret }),
  });
  if (!res.ok) throw new Error(`Oura refresh ${res.status}`);
  return toTokenSet(provider, await res.json());
}

// ---------- Workouts ----------
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchWorkouts(provider: Provider, accessToken: string, weightKg: number): Promise<WorkoutRow[]> {
  const since = new Date(Date.now() - 30 * 86_400_000);

  if (provider === "google") {
    // Google Health API: entrenamientos = data type "exercise" (list method).
    const filter = `exercise.interval.start_time >= "${since.toISOString()}"`;
    const url =
      `https://health.googleapis.com/v4/users/me/dataTypes/exercise/dataPoints?filter=${encodeURIComponent(filter)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Google Health ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return (data.dataPoints ?? []).map((dp: any) => {
      const ex = dp.exercise ?? {};
      const type = normalizeType(ex.exerciseType ?? ex.displayName ?? "");
      const start = ex.interval?.startTime;
      const end = ex.interval?.endTime;
      let durationMin = 0;
      if (ex.activeDuration) durationMin = Math.round(parseInt(String(ex.activeDuration), 10) / 60);
      else if (start && end) durationMin = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
      const kcal = Math.round(ex.metricsSummary?.caloriesKcal ?? 0) || estimate(type, durationMin, weightKg);
      return {
        type,
        name: ex.displayName ?? null,
        duration_min: durationMin,
        kcal_burned: kcal,
        external_id: String(dp.name ?? `${type}-${start ?? ""}`),
        performed_at: start ?? new Date().toISOString(),
      };
    });
  }

  if (provider === "fitbit") {
    const url =
      `https://api.fitbit.com/1/user/-/activities/list.json?afterDate=${ymd(since)}&sort=asc&offset=0&limit=50`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`Fitbit ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return (data.activities ?? []).map((a: any) => {
      const type = normalizeType(a.activityName ?? "");
      const durationMin = Math.round((a.duration ?? 0) / 60000);
      return {
        type,
        name: a.activityName ?? null,
        duration_min: durationMin,
        kcal_burned: Math.round(a.calories ?? 0) || estimate(type, durationMin, weightKg),
        external_id: String(a.logId),
        performed_at: a.startTime ?? new Date().toISOString(),
      };
    });
  }

  // oura
  const url =
    `https://api.ouraring.com/v2/usercollection/workout?start_date=${ymd(since)}&end_date=${ymd(new Date())}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Oura ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.data ?? []).map((wk: any) => {
    const type = normalizeType(wk.activity ?? "");
    const start = wk.start_datetime ? new Date(wk.start_datetime).getTime() : 0;
    const end = wk.end_datetime ? new Date(wk.end_datetime).getTime() : 0;
    const durationMin = end > start ? Math.round((end - start) / 60000) : 0;
    return {
      type,
      name: wk.activity ?? null,
      duration_min: durationMin,
      kcal_burned: Math.round(wk.calories ?? 0) || estimate(type, durationMin, weightKg),
      external_id: String(wk.id),
      performed_at: wk.start_datetime ?? new Date().toISOString(),
    };
  });
}
