-- =====================================================================
-- Perfil del jugador: disponibilidad por día y sugerencia de nivel asistida.
-- Las estadísticas se calculan sobre datos ya existentes (asistencia, pagos,
-- resultados, equipos) — no requieren tablas nuevas.
-- =====================================================================

-- Disponibilidad habitual por día ('lun','mar','mie','jue','vie','sab','dom').
alter table frequent_players
  add column if not exists available_days text[] not null default '{}';

-- Sugerencia de nivel (ajuste asistido): el organizador aprueba o rechaza.
-- NUNCA se aplica automáticamente al skill_level.
alter table frequent_players
  add column if not exists suggested_level int
  check (suggested_level is null or suggested_level between 1 and 3);
