-- =====================================================================
-- NutriCoach — Conexiones genéricas de dispositivos (Fitbit, Oura, …).
-- Un patrón para varios proveedores. Strava sigue en su propia tabla.
-- =====================================================================

-- Permitir 'oura' como origen (fitbit ya estaba permitido).
alter table public.workouts drop constraint if exists workouts_source_check;
alter table public.workouts add constraint workouts_source_check
  check (source in ('manual','apple_health','google_health','garmin','fitbit','amazfit','strava','oura'));

-- Una conexión por (usuario, proveedor). Los tokens los maneja el servidor.
create table if not exists public.device_connections (
  user_id          uuid not null references auth.users(id) on delete cascade,
  provider         text not null check (provider in ('fitbit','oura')),
  access_token     text not null,
  refresh_token    text,
  expires_at       timestamptz,
  external_user_id text,
  scope            text,
  last_synced_at   timestamptz,
  created_at       timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.device_connections enable row level security;

-- El usuario ve/borra sus propias conexiones; las Edge Functions (service_role)
-- escriben y leen tokens. No permitimos insert/update desde el cliente.
create policy device_connections_sel on public.device_connections
  for select using (user_id = auth.uid());
create policy device_connections_del on public.device_connections
  for delete using (user_id = auth.uid());
