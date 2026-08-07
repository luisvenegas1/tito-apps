-- =====================================================================
-- NutriCoach — habilitar el proveedor "google" (Google Health API) en
-- device_connections. La API vieja de Fitbit (api.fitbit.com) se apaga el
-- 30-sep-2026; Google Health API es el reemplazo (cubre Fitbit y Pixel).
-- La fuente 'google_health' de workouts ya estaba permitida (migración 0005).
-- =====================================================================

alter table public.device_connections drop constraint if exists device_connections_provider_check;
alter table public.device_connections add constraint device_connections_provider_check
  check (provider in ('fitbit', 'oura', 'google'));
