-- Anti-duplicados, parte 2: la garantía definitiva.
-- Corré esto DESPUÉS de fusionar los duplicados que ya tenés
-- (tarjeta "Posibles duplicados" en Mis jugadores, o la vista
--  public.duplicate_frequent_players).
--
-- Si falla con "could not create unique index", todavía quedan duplicados:
--   select * from public.duplicate_frequent_players;

create unique index if not exists frequent_players_owner_name_unique
  on frequent_players (owner_id, name_norm);
