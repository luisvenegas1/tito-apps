-- =====================================================================
--  Limpia caracteres invisibles de los nombres y los capitaliza.
--
--  Origen del problema: al copiar la lista de WhatsApp vienen pegados
--  U+2060 (WORD JOINER) y similares. Se ven como nada, pero rompen
--  cualquier capitalización: upper() de un carácter invisible no hace
--  nada, así que la primera letra real nunca se tocaba.
--
--  Pegá TODO y dale Run una sola vez. La última tabla es la verificación.
-- =====================================================================

-- Función de limpieza + capitalización, en SQL puro.
create or replace function public.limpiar_nombre(input text)
returns text
language sql
immutable
as $func$
  with limpio as (
    select btrim(
             regexp_replace(
               translate(
                 -- espacios raros -> espacio normal
                 translate(
                   -- invisibles de ancho cero -> se eliminan
                   translate(
                     coalesce(input, ''),
                     chr(8288) || chr(8203) || chr(8204) || chr(8205) || chr(65279),
                     ''
                   ),
                   chr(160) || chr(8199) || chr(8239),
                   '   '
                 ),
                 '', ''
               ),
               '\s+', ' ', 'g'
             )
           ) as txt
  ),
  palabras as (
    select w.palabra, w.ord
      from limpio,
           unnest(regexp_split_to_array(limpio.txt, ' ')) with ordinality as w(palabra, ord)
     where w.palabra <> ''
  )
  select coalesce(
           string_agg(
             case
               when ord > 1 and lower(palabra) = any (array[
                 'de','del','la','las','los','y','e','da','das','do','dos','van','von','di','el'
               ])
               then lower(palabra)
               else upper(left(palabra, 1)) || lower(substr(palabra, 2))
             end,
             ' ' order by ord
           ),
           ''
         )
    from palabras;
$func$;


-- ---------- Jugadores guardados ----------
update public.frequent_players
   set name     = public.limpiar_nombre(name),
       nickname = nullif(public.limpiar_nombre(nickname), '')
 where name is distinct from public.limpiar_nombre(name)
    or nickname is distinct from nullif(public.limpiar_nombre(nickname), '');


-- ---------- Nombres dentro de cada partido ----------
update public.match_players
   set display_name = public.limpiar_nombre(display_name)
 where display_name is distinct from public.limpiar_nombre(display_name);


-- ---------- Verificación: todo debe dar 0 menos "total" ----------
select count(*)                                             as total,
       count(*) filter (where name = lower(name))           as todo_minuscula,
       count(*) filter (where name <> btrim(name))          as con_espacios,
       count(*) filter (where name ~ '[^[:print:]]')        as con_invisibles
  from public.frequent_players;
