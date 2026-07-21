-- =====================================================================
--  PRUEBA MÍNIMA. Son 2 pasos. Corré UNO A LA VEZ, solo, y mandame
--  la tabla de resultados de cada uno.
--  Borrá el editor entre paso y paso.
-- =====================================================================


-- ---------------------------------------------------------------
-- PASO A  (pegá SOLO estas 5 líneas y Run)
-- ---------------------------------------------------------------
update public.frequent_players
   set name = 'Roly'
 where lower(btrim(name)) = 'roly'
returning id, name as quedo_como;

--  Qué esperar:
--   · Si devuelve 1 fila con quedo_como = 'Roly'  → el UPDATE sí funciona.
--   · Si devuelve 0 filas                          → no hay ningún "roly"
--     (revisá el nombre exacto en el Table Editor y cambialo arriba).
--   · Si da error "read-only transaction"          → el editor está en modo
--     solo lectura; hay que desactivarlo.



-- ---------------------------------------------------------------
-- PASO B  (borrá todo, pegá SOLO estas 3 líneas y Run)
-- ---------------------------------------------------------------
select id, name
  from public.frequent_players
 where lower(btrim(name)) = 'roly';

--  Qué esperar:
--   · name = 'Roly'  → el cambio SÍ persistió. Entonces el problema está
--                      en mi consulta grande, no en la base. Lo arreglo.
--   · name = 'roly'  → el cambio se revirtió: algo lo está deshaciendo
--                      fuera de los triggers. Ahí seguimos por otro lado.
