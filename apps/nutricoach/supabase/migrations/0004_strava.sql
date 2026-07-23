-- =====================================================================
-- NutriCoach — Integración con Strava (importar entrenamientos).
-- Guarda los tokens OAuth por usuario y habilita 'strava' como origen.
-- =====================================================================

-- Permitir 'strava' como origen de un entrenamiento.
alter table public.workouts drop constraint if exists workouts_source_check;
alter table public.workouts add constraint workouts_source_check
  check (source in ('manual','apple_health','google_health','garmin','fitbit','amazfit','strava'));

-- Conexión de Strava por usuario (tokens). Solo el servidor escribe/lee tokens.
create table if not exists public.strava_connections (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  athlete_id    bigint,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  scope         text,
  last_synced_at timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.strava_connections enable row level security;

-- El usuario puede ver SI está conectado (su propia fila); las Edge Functions
-- (service_role) hacen el resto. No permitimos insert/update/delete desde el cliente.
create policy strava_connections_sel on public.strava_connections
  for select using (user_id = auth.uid());
create policy strava_connections_del on public.strava_connections
  for delete using (user_id = auth.uid());
