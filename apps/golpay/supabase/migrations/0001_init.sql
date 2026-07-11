-- =====================================================================
-- GolPay - Esquema inicial (Postgres / Supabase)
-- Fase 0-1: partidos, jugadores, pagos, equipos, frecuentes, auditoría.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tipos ----------
create type match_type as enum ('mejenga', 'torneo');
create type match_status as enum ('abierto', 'cerrado', 'cancelado');
create type payment_status as enum (
  'pendiente', 'reportado', 'confirmado', 'parcial', 'exonerado', 'no_asistio'
);
create type preferred_position as enum ('portero', 'defensa', 'medio', 'delantero');

-- ---------- profiles (organizadores) ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

-- Crea el profile automáticamente al registrarse.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- frequent_players ----------
create table frequent_players (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  nickname text,
  phone text,
  skill_level int check (skill_level between 1 and 5), -- PRIVADO
  preferred_position preferred_position,
  can_be_goalkeeper boolean not null default false,
  -- Atributos opcionales para el futuro (nullable):
  speed int, technique int, stamina int,
  last_played_at timestamptz,
  created_at timestamptz not null default now()
);
create index on frequent_players (owner_id);

-- ---------- matches ----------
create table matches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  type match_type not null default 'mejenga',
  date date not null,
  time time,
  location text,
  cost_per_player int not null default 0,
  max_players int,
  notes text,
  public_token uuid not null default gen_random_uuid(),
  access_pin_hash text,               -- PIN 4 dígitos, hasheado (nunca en claro)
  status match_status not null default 'abierto',
  created_at timestamptz not null default now()
);
create unique index on matches (public_token);
create index on matches (owner_id);

-- ---------- match_players ----------
create table match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  frequent_player_id uuid references frequent_players(id) on delete set null,
  display_name text not null,
  amount_due int not null default 0,
  amount_paid int not null default 0,
  payment_status payment_status not null default 'pendiente',
  payment_method text,
  note text,
  reported_at timestamptz,
  confirmed_at timestamptz,
  paid_by_player_id uuid references match_players(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on match_players (match_id);

-- ---------- teams ----------
create table teams (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  name text not null,
  total_score int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index on teams (match_id);

create table team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  match_player_id uuid not null references match_players(id) on delete cascade,
  unique (team_id, match_player_id)
);

-- ---------- payment_events (audit log) ----------
create table payment_events (
  id uuid primary key default gen_random_uuid(),
  match_player_id uuid not null references match_players(id) on delete cascade,
  old_status payment_status,
  new_status payment_status,
  changed_by text not null,           -- 'player' | 'organizer'
  actor_id uuid,                      -- profiles.id si fue el organizador
  amount int,
  created_at timestamptz not null default now()
);
create index on payment_events (match_player_id);

-- =====================================================================
-- ROW LEVEL SECURITY
-- Regla base: el rol anon NO accede a las tablas directamente.
-- El jugador entra sólo por funciones RPC (SECURITY DEFINER) con token+PIN.
-- =====================================================================
alter table profiles          enable row level security;
alter table frequent_players  enable row level security;
alter table matches           enable row level security;
alter table match_players     enable row level security;
alter table teams             enable row level security;
alter table team_members      enable row level security;
alter table payment_events    enable row level security;

-- profiles: cada quien el suyo
create policy "profiles_self" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- frequent_players: sólo el dueño
create policy "freq_owner" on frequent_players
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- matches: sólo el dueño
create policy "matches_owner" on matches
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- match_players: sólo si el partido es del organizador
create policy "mp_owner" on match_players
  for all using (
    exists (select 1 from matches m where m.id = match_id and m.owner_id = auth.uid())
  ) with check (
    exists (select 1 from matches m where m.id = match_id and m.owner_id = auth.uid())
  );

-- teams / team_members
create policy "teams_owner" on teams
  for all using (
    exists (select 1 from matches m where m.id = match_id and m.owner_id = auth.uid())
  ) with check (
    exists (select 1 from matches m where m.id = match_id and m.owner_id = auth.uid())
  );

create policy "tm_owner" on team_members
  for all using (
    exists (
      select 1 from teams t join matches m on m.id = t.match_id
      where t.id = team_id and m.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from teams t join matches m on m.id = t.match_id
      where t.id = team_id and m.owner_id = auth.uid()
    )
  );

-- payment_events: lectura para el dueño del partido
create policy "pe_owner" on payment_events
  for select using (
    exists (
      select 1 from match_players mp join matches m on m.id = mp.match_id
      where mp.id = match_player_id and m.owner_id = auth.uid()
    )
  );

-- =====================================================================
-- RPC PÚBLICAS (acceso del jugador sin cuenta)
-- =====================================================================

-- Devuelve datos SEGUROS del partido por token (sin PIN, sin niveles, sin teléfonos).
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
    'payment_status', mp.payment_status
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

-- El jugador REPORTA su pago (nunca confirma). Requiere PIN válido.
-- covered_ids: otros match_players que este jugador declara haber cubierto.
create or replace function report_payment(
  p_token uuid,
  p_pin text,
  p_match_player_id uuid,
  p_method text default null,
  p_note text default null,
  p_covered_ids uuid[] default '{}'
)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_match matches;
  v_old payment_status;
  v_id uuid;
begin
  select * into v_match from matches where public_token = p_token;
  if not found then raise exception 'Partido no encontrado'; end if;

  -- Validar PIN
  if v_match.access_pin_hash is null
     or v_match.access_pin_hash <> crypt(p_pin, v_match.access_pin_hash) then
    raise exception 'PIN incorrecto';
  end if;

  -- El jugador reportado debe pertenecer a este partido
  if not exists (
    select 1 from match_players
    where id = p_match_player_id and match_id = v_match.id
  ) then
    raise exception 'Jugador no pertenece al partido';
  end if;

  -- Reportar el propio + cubiertos, sin pisar pagos ya confirmados
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

-- Permisos: anon sólo puede ejecutar estas dos funciones.
revoke all on function get_public_match(uuid) from public;
revoke all on function report_payment(uuid, text, uuid, text, text, uuid[]) from public;
grant execute on function get_public_match(uuid) to anon, authenticated;
grant execute on function report_payment(uuid, text, uuid, text, text, uuid[]) to anon, authenticated;

-- Helper para el organizador: setear/rotar el PIN (hashea con bcrypt).
create or replace function set_match_pin(p_match_id uuid, p_pin text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from matches where id = p_match_id and owner_id = auth.uid()) then
    raise exception 'No autorizado';
  end if;
  update matches set access_pin_hash = crypt(p_pin, gen_salt('bf'))
  where id = p_match_id;
end;
$$;
grant execute on function set_match_pin(uuid, text) to authenticated;
