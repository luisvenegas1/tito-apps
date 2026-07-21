-- Diagnóstico de "no puedo guardar nombres con mayúscula".
--
-- OJO: en el SQL Editor corrés como rol `postgres`, NO como tu usuario de la
-- app. Por eso auth.uid() devuelve NULL acá y cualquier comparación contra
-- auth.uid() da 0. Para revisar la pertenencia hay que comparar contra tu id
-- real, que es lo que hace la consulta 3.

-- 1) ¿Existe la función que capitaliza el histórico? (la crea la 0015)
--    0 = falta correr 0015_title_case_names.sql
select count(*) as tiene_title_case_name
  from pg_proc where proname = 'title_case_name';

-- 2) ¿Hay algún trigger sobre frequent_players tocando el nombre?
--    Lo esperado es CERO filas.
select tgname, pg_get_triggerdef(t.oid) as definicion
  from pg_trigger t
 where t.tgrelid = 'public.frequent_players'::regclass
   and not t.tgisinternal;

-- 3) ¿Todos los jugadores son de la misma cuenta?
--    Si aparece MÁS DE UNA fila, hay jugadores repartidos entre cuentas y por
--    eso RLS bloquearía los updates de algunos.
select fp.owner_id, u.email, count(*) as jugadores
  from public.frequent_players fp
  join auth.users u on u.id = fp.owner_id
 group by fp.owner_id, u.email;

-- 4) Nombres que quedarían distintos después de limpiarlos.
--    "espacios" son los que tienen espacio al inicio o al final.
select count(*) as total,
       count(*) filter (where name <> btrim(name))            as espacios,
       count(*) filter (where name = lower(name))             as todo_minuscula
  from public.frequent_players;

-- 5) Cómo se verían después de la 0015 (no cambia nada, solo muestra).
--    Requiere haber corrido 0015 primero.
-- select name as antes, public.title_case_name(name) as despues
--   from public.frequent_players order by name;
