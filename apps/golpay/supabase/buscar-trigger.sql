-- Un solo statement: pegá esto SOLO (borrá todo lo demás del editor) y Run.
-- Muestra todos los triggers y sus funciones sobre las tablas de nombres.
--
-- Si aparece alguna fila, ahí está el culpable: mirá la columna "cuerpo",
-- va a tener algo tipo  new.name := lower(...)
select
  c.relname                as tabla,
  t.tgname                 as trigger,
  p.proname                as funcion,
  pg_get_functiondef(p.oid) as cuerpo
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc  p on p.oid = t.tgfoid
where not t.tgisinternal
  and c.relnamespace = 'public'::regnamespace
  and c.relname in ('frequent_players', 'match_players');
