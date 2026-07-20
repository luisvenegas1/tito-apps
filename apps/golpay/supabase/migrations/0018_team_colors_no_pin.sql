-- 1) Color de camiseta por equipo.
-- 2) Se elimina el PIN: el enlace público (token uuid, imposible de adivinar)
--    pasa a ser la única credencial. Decisión del organizador: es una mejenga
--    entre conocidos y el PIN estorbaba más de lo que protegía.
--
-- Las RPC siguen siendo SECURITY DEFINER y siguen validando que el jugador
-- pertenezca al partido del token: nadie puede tocar otro partido.
-- Se conserva TODA la lógica previa (lista de espera, auto-promoción,
-- pagos cubiertos, payment_events, comprobantes).

-- ---------- Colores ----------
alter table teams add column if not exists color text;
-- Equipos ya publicados: color null → la app sigue mostrando su nombre viejo.

-- La página pública necesita el color; el orden de los equipos pasa a ser el
-- de creación (antes era alfabético por nombre y con colores no tiene sentido).
create or replace function get_public_match(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_match matches;
  v_players json;
  v_teams json;
  v_result json;
  v_sinpe json;
begin
  select * into v_match from matches where public_token = p_token;
  if not found then return null; end if;

  select coalesce(json_agg(json_build_object(
    'id', mp.id, 'display_name', mp.display_name, 'amount_due', mp.amount_due,
    'payment_status', mp.payment_status, 'attendance_status', mp.attendance_status,
    'is_goalkeeper', mp.is_goalkeeper
  ) order by mp.display_name), '[]')
  into v_players from match_players mp where mp.match_id = v_match.id;

  select coalesce(json_agg(json_build_object(
    'id', t.id, 'name', t.name, 'color', t.color,
    'members', (select coalesce(json_agg(mp.display_name), '[]')
      from team_members tmb join match_players mp on mp.id = tmb.match_player_id
      where tmb.team_id = t.id)
  ) order by t.created_at), '[]')
  into v_teams from teams t where t.match_id = v_match.id and t.published = true;

  select json_build_object(
    'winner_team_name', (select coalesce(color, name) from teams where id = r.winner_team_id),
    'mvp_name', (select display_name from match_players where id = r.mvp_match_player_id),
    'score', r.score
  ) into v_result from match_results r where r.match_id = v_match.id;

  select json_build_object('number', p.sinpe_number, 'name', p.sinpe_name)
    into v_sinpe from profiles p where p.id = v_match.owner_id and p.sinpe_number is not null;

  return json_build_object(
    'id', v_match.id, 'title', v_match.title, 'type', v_match.type, 'date', v_match.date,
    'time', v_match.time, 'location', v_match.location, 'cost_per_player', v_match.cost_per_player,
    'status', v_match.status, 'list_closed', v_match.list_closed, 'max_players', v_match.max_players,
    'players', v_players, 'teams', v_teams, 'result', v_result, 'sinpe', v_sinpe
  );
end;
$$;

-- ---------- Asistencia sin PIN ----------
create or replace function set_attendance(
  p_token uuid,
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

revoke all on function set_attendance(uuid, uuid, text) from public;
grant execute on function set_attendance(uuid, uuid, text) to anon, authenticated;

-- ---------- Reporte de pago sin PIN ----------
create or replace function report_payment(
  p_token uuid, p_match_player_id uuid,
  p_method text default null, p_note text default null,
  p_covered_ids uuid[] default '{}', p_proof_path text default null
)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_match matches; v_old payment_status; v_id uuid;
begin
  select * into v_match from matches where public_token = p_token;
  if not found then raise exception 'Partido no encontrado'; end if;
  if not exists (select 1 from match_players where id = p_match_player_id and match_id = v_match.id) then
    raise exception 'Jugador no pertenece al partido';
  end if;

  foreach v_id in array (array[p_match_player_id] || coalesce(p_covered_ids, '{}'))
  loop
    if not exists (select 1 from match_players where id = v_id and match_id = v_match.id) then continue; end if;
    select payment_status into v_old from match_players where id = v_id;
    if v_old = 'confirmado' then continue; end if;
    update match_players
      set payment_status = 'reportado', reported_at = now(),
          payment_method = coalesce(p_method, payment_method),
          note = coalesce(p_note, note),
          payment_proof_path = case when v_id = p_match_player_id then coalesce(p_proof_path, payment_proof_path) else payment_proof_path end,
          paid_by_player_id = case when v_id <> p_match_player_id then p_match_player_id else paid_by_player_id end
      where id = v_id;
    insert into payment_events (match_player_id, old_status, new_status, changed_by, amount)
    values (v_id, v_old, 'reportado', 'player', null);
  end loop;
  return json_build_object('ok', true);
end;
$$;

revoke all on function report_payment(uuid, uuid, text, text, uuid[], text) from public;
grant execute on function report_payment(uuid, uuid, text, text, uuid[], text) to anon, authenticated;

-- ---------- Validación para la Edge Function de comprobantes ----------
-- Reemplaza a verify_match_pin: ya no hay PIN que verificar, solo que el
-- jugador exista dentro del partido del token.
create or replace function verify_match_player(p_token uuid, p_match_player_id uuid)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_match_id uuid;
begin
  select id into v_match_id from matches where public_token = p_token;
  if v_match_id is null then return null; end if;
  if not exists (select 1 from match_players where id = p_match_player_id and match_id = v_match_id) then
    return null;
  end if;
  return v_match_id;
end;
$$;
revoke all on function verify_match_player(uuid, uuid) from public;
grant execute on function verify_match_player(uuid, uuid) to service_role;

-- ---------- Limpieza de las versiones con PIN ----------
drop function if exists set_attendance(uuid, text, uuid, text);
drop function if exists report_payment(uuid, text, uuid, text, text, uuid[], text);
drop function if exists verify_match_pin(uuid, text);
drop function if exists set_match_pin(uuid, text);

-- La columna del PIN queda sin uso. Se puede borrar cuando quieras:
--   alter table matches drop column access_pin_hash;
