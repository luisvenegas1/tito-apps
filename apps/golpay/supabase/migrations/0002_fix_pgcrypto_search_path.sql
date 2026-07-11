-- =====================================================================
-- Fix: en Supabase pgcrypto (crypt, gen_salt) vive en el esquema
-- `extensions`, no en `public`. Agregamos `extensions` al search_path
-- de las funciones que hashean/verifican el PIN.
-- =====================================================================

-- Asegura que la extensión esté en el esquema extensions.
create extension if not exists pgcrypto with schema extensions;

-- set_match_pin: hashea el PIN con bcrypt.
create or replace function set_match_pin(p_match_id uuid, p_pin text)
returns void language plpgsql security definer
set search_path = public, extensions as $$
begin
  if not exists (select 1 from matches where id = p_match_id and owner_id = auth.uid()) then
    raise exception 'No autorizado';
  end if;
  update matches set access_pin_hash = crypt(p_pin, gen_salt('bf'))
  where id = p_match_id;
end;
$$;

-- report_payment: verifica el PIN con crypt.
create or replace function report_payment(
  p_token uuid,
  p_pin text,
  p_match_player_id uuid,
  p_method text default null,
  p_note text default null,
  p_covered_ids uuid[] default '{}'
)
returns json language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_match matches;
  v_old payment_status;
  v_id uuid;
begin
  select * into v_match from matches where public_token = p_token;
  if not found then raise exception 'Partido no encontrado'; end if;

  if v_match.access_pin_hash is null
     or v_match.access_pin_hash <> crypt(p_pin, v_match.access_pin_hash) then
    raise exception 'PIN incorrecto';
  end if;

  if not exists (
    select 1 from match_players
    where id = p_match_player_id and match_id = v_match.id
  ) then
    raise exception 'Jugador no pertenece al partido';
  end if;

  foreach v_id in array (array[p_match_player_id] || coalesce(p_covered_ids, '{}'))
  loop
    if not exists (select 1 from match_players where id = v_id and match_id = v_match.id) then
      continue;
    end if;
    select payment_status into v_old from match_players where id = v_id;
    if v_old = 'confirmado' then continue; end if;

    update match_players
      set payment_status = 'reportado',
          reported_at = now(),
          payment_method = coalesce(p_method, payment_method),
          note = coalesce(p_note, note),
          paid_by_player_id = case when v_id <> p_match_player_id
                                   then p_match_player_id else paid_by_player_id end
      where id = v_id;

    insert into payment_events (match_player_id, old_status, new_status, changed_by, amount)
    values (v_id, v_old, 'reportado', 'player', null);
  end loop;

  return json_build_object('ok', true);
end;
$$;
