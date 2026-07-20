-- Normaliza los nombres ya guardados a "Primera Letra En Mayúscula".
-- Opcional: la app ya guarda así de aquí en adelante; esto arregla el histórico.

-- Capitaliza palabra por palabra dejando las partículas del español en
-- minúscula: "juan de la cruz" -> "Juan de la Cruz".
create or replace function public.title_case_name(input text)
returns text
language plpgsql
immutable
as $$
declare
  parts text[];
  out_parts text[] := '{}';
  w text;
  i int := 0;
  particles text[] := array['de','del','la','las','los','y','e','da','das','do','dos','van','von','di','el'];
begin
  if input is null or btrim(input) = '' then
    return input;
  end if;
  parts := regexp_split_to_array(regexp_replace(btrim(input), '\s+', ' ', 'g'), ' ');
  foreach w in array parts loop
    i := i + 1;
    if i > 1 and lower(w) = any(particles) then
      out_parts := out_parts || lower(w);
    else
      out_parts := out_parts || (upper(left(w, 1)) || lower(substr(w, 2)));
    end if;
  end loop;
  return array_to_string(out_parts, ' ');
end;
$$;

update public.frequent_players
   set name = public.title_case_name(name),
       nickname = public.title_case_name(nickname)
 where name is distinct from public.title_case_name(name)
    or nickname is distinct from public.title_case_name(nickname);

update public.match_players
   set display_name = public.title_case_name(display_name)
 where display_name is distinct from public.title_case_name(display_name);
