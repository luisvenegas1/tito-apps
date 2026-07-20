-- =====================================================================
-- Escala de nivel 1–5, preservando el significado de las etiquetas actuales.
--   1 Recreativo · 2 Casual (nuevo) · 3 Intermedio · 4 Avanzado · 5 Élite (nuevo)
--
-- Remapeo de los datos existentes (el orden importa para no colisionar):
--   Avanzado   3 -> 4
--   Intermedio 2 -> 3
--   Recreativo 1 -> 1 (sin cambio)
-- Reversible: para volver, 4->3 y 3->2 (en ese orden).
-- =====================================================================

alter table frequent_players drop constraint if exists frequent_players_skill_level_check;
alter table frequent_players drop constraint if exists frequent_players_suggested_level_check;

-- Ampliamos primero el rango permitido, luego remapeamos.
alter table frequent_players
  add constraint frequent_players_skill_level_check
  check (skill_level is null or skill_level between 1 and 5);
alter table frequent_players
  add constraint frequent_players_suggested_level_check
  check (suggested_level is null or suggested_level between 1 and 5);

update frequent_players set skill_level = 4 where skill_level = 3;
update frequent_players set skill_level = 3 where skill_level = 2;

update frequent_players set suggested_level = 4 where suggested_level = 3;
update frequent_players set suggested_level = 3 where suggested_level = 2;
