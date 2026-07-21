-- ============================================================
--  ARREGLAR NOMBRES  —  pegá TODO y dale Run una sola vez.
--  No depende de ninguna función previa: hace todo inline.
--  Al final te muestra una tabla con el resultado.
-- ============================================================

-- ---------- PASO 1: jugadores guardados ----------
with fuente as (
  select
    fp.id,
    fp.name as antes,
    coalesce(
      (
        select string_agg(
                 case
                   -- partículas en minúscula salvo si son la primera palabra
                   when w.ord > 1 and lower(w.palabra) = any (array[
                     'de','del','la','las','los','y','e','da','das','do','dos','van','von','di','el'
                   ])
                   then lower(w.palabra)
                   else upper(left(w.palabra, 1)) || lower(substr(w.palabra, 2))
                 end,
                 ' ' order by w.ord
               )
          from unnest(
                 regexp_split_to_array(
                   btrim(regexp_replace(fp.name, '\s+', ' ', 'g')),
                   ' '
                 )
               ) with ordinality as w(palabra, ord)
         where w.palabra <> ''
      ),
      fp.name
    ) as despues
  from public.frequent_players fp
),
cambios as (
  update public.frequent_players fp
     set name = f.despues
    from fuente f
   where fp.id = f.id
     and fp.name is distinct from f.despues
  returning fp.id
)
select count(*) as jugadores_corregidos from cambios;


-- ---------- PASO 2: nombres dentro de cada partido ----------
with fuente as (
  select
    mp.id,
    coalesce(
      (
        select string_agg(
                 case
                   when w.ord > 1 and lower(w.palabra) = any (array[
                     'de','del','la','las','los','y','e','da','das','do','dos','van','von','di','el'
                   ])
                   then lower(w.palabra)
                   else upper(left(w.palabra, 1)) || lower(substr(w.palabra, 2))
                 end,
                 ' ' order by w.ord
               )
          from unnest(
                 regexp_split_to_array(
                   btrim(regexp_replace(mp.display_name, '\s+', ' ', 'g')),
                   ' '
                 )
               ) with ordinality as w(palabra, ord)
         where w.palabra <> ''
      ),
      mp.display_name
    ) as despues
  from public.match_players mp
),
cambios as (
  update public.match_players mp
     set display_name = f.despues
    from fuente f
   where mp.id = f.id
     and mp.display_name is distinct from f.despues
  returning mp.id
)
select count(*) as nombres_en_partidos_corregidos from cambios;


-- ---------- PASO 3: verificación (ESTA es la tabla que importa) ----------
-- todo_minuscula y con_espacios tienen que quedar en 0.
select count(*)                                          as total,
       count(*) filter (where name = lower(name))        as todo_minuscula,
       count(*) filter (where name <> btrim(name))       as con_espacios
  from public.frequent_players;
