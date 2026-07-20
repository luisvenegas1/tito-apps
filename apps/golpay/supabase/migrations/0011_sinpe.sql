-- =====================================================================
-- SINPE configurable por organizador (sin asumir banco). Se muestra al
-- jugador en la vista pública con monto exacto y botón de copiar.
-- =====================================================================
alter table profiles add column if not exists sinpe_number text;
alter table profiles add column if not exists sinpe_name text;

-- get_public_match: ahora incluye el SINPE del organizador dueño del partido.
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
    'id', t.id, 'name', t.name,
    'members', (select coalesce(json_agg(mp.display_name), '[]')
      from team_members tmb join match_players mp on mp.id = tmb.match_player_id
      where tmb.team_id = t.id)
  )), '[]')
  into v_teams from teams t where t.match_id = v_match.id and t.published = true;

  select json_build_object(
    'winner_team_name', (select name from teams where id = r.winner_team_id),
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
