-- =====================================================================
-- Escala de nivel 1–3 (antes 1–5). No hay jugadores reales todavía,
-- así que no se necesita remapeo de datos.
--   1 = Recreativo · 2 = Intermedio · 3 = Avanzado
-- =====================================================================

-- Por si acaso hubiera algún dato fuera de rango, lo acotamos antes.
update frequent_players set skill_level = 3 where skill_level > 3;

alter table frequent_players
  drop constraint if exists frequent_players_skill_level_check;

alter table frequent_players
  add constraint frequent_players_skill_level_check
  check (skill_level between 1 and 3);
