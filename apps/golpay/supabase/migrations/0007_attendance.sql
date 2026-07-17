-- =====================================================================
-- Asistencia (RSVP + check-in), independiente del pago.
-- =====================================================================
create type attendance_status as enum (
  'pendiente', 'tal_vez', 'confirmado', 'lista_espera', 'declinado', 'asistio', 'no_asistio'
);

alter table match_players
  add column if not exists attendance_status attendance_status not null default 'pendiente';

-- Marca de tiempo de confirmación (para promover por orden de llegada).
alter table match_players
  add column if not exists confirmed_attendance_at timestamptz;

-- Cierre de lista del partido.
alter table matches
  add column if not exists list_closed boolean not null default false;

-- RSVP del jugador (protegido por PIN), con cupo y lista de espera + auto-promoción.
create or replace function set_attendance(
  p_token uuid,
  p_pin text,
  p_match_player_id uuid,
  p_status text
)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_match matches;
  v_old attendance_status;
  v_confirmed int;
  v_target attendance_status;
  v_promote uuid;
begin
  select * into v_match from matches where public_token = p_token;
  if not found then raise exception 'Partido no encontrado'; end if;
  if v_match.access_pin_hash is null
     or v_match.access_pin_hash <> crypt(p_pin, v_match.access_pin_hash) then
    raise exception 'PIN incorrecto';
  end if;
  if v_match.list_closed then raise exception 'La lista está cerrada'; end if;
  if not exists (select 1 from match_players where id = p_match_player_id and match_id = v_match.id) then
    raise exception 'Jugador no pertenece al partido';
  end if;

  select attendance_status into v_old from match_players where id = p_match_player_id;
  v_target := p_status::attendance_status;

  -- Cupo: si confirma y no hay lugar, va a lista de espera.
  if v_target = 'confirmado' and v_match.max_players is not null then
    select count(*) into v_confirmed from match_players
      where match_id = v_match.id and attendance_status = 'confirmado' and id <> p_match_player_id;
    if v_confirmed >= v_match.max_players then
      v_target := 'lista_espera';
    end if;
  end if;

  update match_players
    set attendance_status = v_target,
        confirmed_attendance_at = case when v_target = 'confirmado' then now() else confirmed_attendance_at end
    where id = p_match_player_id;

  -- Auto-promoción: si alguien confirmado se va, sube el primero en lista de espera.
  if v_old = 'confirmado' and v_target in ('declinado', 'tal_vez', 'pendiente')
     and v_match.max_players is not null then
    select id into v_promote from match_players
      where match_id = v_match.id and attendance_status = 'lista_espera'
      order by confirmed_attendance_at nulls last, created_at
      limit 1;
    if v_promote is not null then
      update match_players set attendance_status = 'confirmado', confirmed_attendance_at = now()
        where id = v_promote;
    end if;
  end if;

  return json_build_object('ok', true, 'status', v_target);
end;
$$;

revoke all on function set_attendance(uuid, text, uuid, text) from public;
grant execute on function set_attendance(uuid, text, uuid, text) to anon, authenticated;
