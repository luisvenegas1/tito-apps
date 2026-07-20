-- Anti-duplicados de "Mis jugadores", parte 1: normalización + fusión.
-- (El índice único va en 0017, después de limpiar los duplicados que ya existen.)

-- ---------- Nombre normalizado ----------
-- Misma regla que la app: sin acentos, minúsculas, sin puntuación,
-- espacios colapsados. "Sebas  C." y "sebas c" caen en la misma clave.
create or replace function public.norm_name(input text)
returns text
language sql
immutable
as $$
  select btrim(
    regexp_replace(
      translate(
        lower(coalesce(input, '')),
        'áàäâãéèëêíìïîóòöôõúùüûñç',
        'aaaaaeeeeiiiiooooouuuunc'
      ),
      '[^a-z0-9]+', ' ', 'g'
    ),
    ' '
  );
$$;

alter table frequent_players
  add column if not exists name_norm text generated always as (public.norm_name(name)) stored;

-- Acelera la búsqueda de coincidencias y el chequeo de duplicados.
create index if not exists frequent_players_owner_norm_idx
  on frequent_players (owner_id, name_norm);

-- ---------- Fusionar dos perfiles ----------
-- Repunta los partidos del perfil descartado al que se conserva, rescata los
-- datos que el conservado no tenga, y borra el duplicado.
create or replace function public.merge_frequent_players(keep_id uuid, drop_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  ok_keep boolean;
  ok_drop boolean;
begin
  if keep_id = drop_id then
    return;
  end if;

  select exists (select 1 from frequent_players where id = keep_id and owner_id = auth.uid()) into ok_keep;
  select exists (select 1 from frequent_players where id = drop_id and owner_id = auth.uid()) into ok_drop;
  if not (ok_keep and ok_drop) then
    raise exception 'No autorizado';
  end if;

  update match_players set frequent_player_id = keep_id where frequent_player_id = drop_id;

  update frequent_players k
     set skill_level        = coalesce(k.skill_level, d.skill_level),
         suggested_level    = coalesce(k.suggested_level, d.suggested_level),
         preferred_position = coalesce(k.preferred_position, d.preferred_position),
         can_be_goalkeeper  = k.can_be_goalkeeper or d.can_be_goalkeeper,
         phone              = coalesce(k.phone, d.phone),
         nickname           = coalesce(k.nickname, d.nickname),
         notes              = coalesce(k.notes, d.notes),
         last_played_at     = greatest(k.last_played_at, d.last_played_at),
         available_days     = (select coalesce(array_agg(distinct x), '{}')
                                 from unnest(k.available_days || d.available_days) as x),
         is_active          = k.is_active or d.is_active
    from frequent_players d
   where k.id = keep_id and d.id = drop_id;

  delete from frequent_players where id = drop_id;
end;
$$;

revoke all on function public.merge_frequent_players(uuid, uuid) from public;
grant execute on function public.merge_frequent_players(uuid, uuid) to authenticated;

-- ---------- Ver qué duplicados hay hoy ----------
-- select * from public.duplicate_frequent_players;
create or replace view public.duplicate_frequent_players as
  select owner_id, name_norm, count(*) as total, array_agg(name order by created_at) as nombres
    from frequent_players
   group by owner_id, name_norm
  having count(*) > 1;
