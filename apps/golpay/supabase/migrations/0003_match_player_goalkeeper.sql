-- =====================================================================
-- Portero por partido.
-- El perfil (frequent_players.can_be_goalkeeper) guarda el valor "de siempre",
-- pero cada partido registra quién fue portero ESE día en match_players.
-- =====================================================================

alter table match_players
  add column if not exists is_goalkeeper boolean not null default false;

-- Exponer is_goalkeeper en la vista pública (por si querés mostrar 🧤 al jugador).
create or replace function get_public_match(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_match matches;
  v_players json;
  v_teams json;
begin
  select * into v_match from matches where public_token = p_token;
  if not found then
    return null;
  end if;

  select coalesce(json_agg(json_build_object(
    'id', mp.id,
    'display_name', mp.display_name,
    'amount_due', mp.amount_due,
    'payment_status', mp.payment_status,
    'is_goalkeeper', mp.is_goalkeeper
  ) order by mp.display_name), '[]')
  into v_players
  from match_players mp where mp.match_id = v_match.id;

  select coalesce(json_agg(json_build_object(
    'id', t.id, 'name', t.name,
    'members', (
      select coalesce(json_agg(mp.display_name), '[]')
      from team_members tmb join match_players mp on mp.id = tmb.match_player_id
      where tmb.team_id = t.id
    )
  )), '[]')
  into v_teams
  from teams t where t.match_id = v_match.id and t.published = true;

  return json_build_object(
    'id', v_match.id,
    'title', v_match.title,
    'type', v_match.type,
    'date', v_match.date,
    'time', v_match.time,
    'location', v_match.location,
    'cost_per_player', v_match.cost_per_player,
    'status', v_match.status,
    'players', v_players,
    'teams', v_teams
  );
end;
$$;
