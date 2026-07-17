-- =====================================================================
-- Plantillas de partido (partidos recurrentes / "crear como el anterior").
-- =====================================================================
create table if not exists match_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  type match_type not null default 'mejenga',
  time time,
  location text,
  cost_per_player int not null default 0,
  max_players int,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists match_templates_owner_idx on match_templates (owner_id);

alter table match_templates enable row level security;

create policy "templates_owner" on match_templates
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
