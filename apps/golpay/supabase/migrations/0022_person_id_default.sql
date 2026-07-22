-- Al importar jugadores nuevos, la app no manda person_id (no puede: el id se
-- genera en la BD), y como la 0020 lo dejó NOT NULL, el insert fallaba con
-- "null value in column person_id violates not-null constraint".
--
-- Solución: person_id se genera solo, igual que id. Cada jugador nuevo nace
-- siendo su propia identidad. Vincular a otra persona (mismo person_id entre
-- grupos) se hará después, editándolo.

alter table frequent_players
  alter column person_id set default gen_random_uuid();

-- Por si quedó alguna fila sin person_id de intentos previos.
update frequent_players set person_id = gen_random_uuid() where person_id is null;
