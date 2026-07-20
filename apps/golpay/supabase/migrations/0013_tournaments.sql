-- =====================================================================
-- Minitorneo simple: juegos round-robin entre los equipos de un partido.
-- Formato sencillo (no una liga completa). La tabla se calcula en la app.
-- =====================================================================
create table if not exists match_games (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  home_team_id uuid not null references teams(id) on delete cascade,
  away_team_id uuid not null references teams(id) on delete cascade,
  home_score int not null default 0,
  away_score int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists match_games_match_idx on match_games (match_id);

alter table match_games enable row level security;
create policy "match_games_owner" on match_games
  for all using (
    exists (select 1 from matches m where m.id = match_id and m.owner_id = auth.uid())
  ) with check (
    exists (select 1 from matches m where m.id = match_id and m.owner_id = auth.uid())
  );

-- Posiciones finales opcionales (orden de team_ids) en el resultado.
alter table match_results add column if not exists positions jsonb;
