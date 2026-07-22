-- =====================================================================
-- NutriCoach — migración inicial (0001)
-- Schema completo + RLS. Ver apps/nutricoach/docs/database.md
-- =====================================================================

-- ---------- helper: updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  display_name  text,
  sex           text check (sex in ('male','female')),
  birth_date    date,
  height_cm     numeric,
  activity_level text check (activity_level in ('sedentary','light','moderate','active','very_active')),
  units         text not null default 'metric' check (units in ('metric','imperial')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- goals ----------
create table if not exists public.goals (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  type             text not null check (type in ('lose_fat','gain_muscle','maintain','deficit','bulk','custom')),
  target_weight_kg numeric,
  rate_kg_per_week numeric,
  calorie_target   integer not null,
  protein_g        integer not null,
  carb_g           integer not null,
  fat_g            integer not null,
  fiber_g          integer,
  sugar_g_max      integer,
  sodium_mg_max    integer,
  water_ml         integer,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);
create unique index if not exists goals_one_active_per_user
  on public.goals(user_id) where is_active;

-- ---------- foods (catálogo: custom / barcode / ai / search) ----------
create table if not exists public.foods (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  brand      text,
  barcode    text,
  source     text not null default 'custom' check (source in ('custom','barcode','ai','search')),
  serving_g  numeric,
  -- por 100 g
  kcal       numeric not null default 0,
  protein_g  numeric not null default 0,
  carb_g     numeric not null default 0,
  fat_g      numeric not null default 0,
  fiber_g    numeric,
  sugar_g    numeric,
  sodium_mg  numeric,
  created_at timestamptz not null default now()
);
create unique index if not exists foods_user_barcode
  on public.foods(user_id, barcode) where barcode is not null;
create index if not exists foods_user_name on public.foods(user_id, name);

-- ---------- food_logs (un día) ----------
create table if not exists public.food_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  log_date   date not null,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- ---------- log_items (alimentos consumidos, macros snapshot) ----------
create table if not exists public.log_items (
  id          uuid primary key default gen_random_uuid(),
  food_log_id uuid not null references public.food_logs(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  food_id     uuid references public.foods(id) on delete set null,
  name        text not null,
  grams       numeric not null,
  meal        text not null default 'snack' check (meal in ('breakfast','lunch','dinner','snack')),
  kcal        numeric not null default 0,
  protein_g   numeric not null default 0,
  carb_g      numeric not null default 0,
  fat_g       numeric not null default 0,
  fiber_g     numeric,
  sugar_g     numeric,
  sodium_mg   numeric,
  source      text not null check (source in ('photo','scale','label','barcode','search','custom','recipe')),
  confidence  numeric,
  created_at  timestamptz not null default now()
);
create index if not exists log_items_log on public.log_items(food_log_id);

-- ---------- weight_logs ----------
create table if not exists public.weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  weight_kg  numeric not null,
  logged_at  timestamptz not null default now()
);
create index if not exists weight_logs_user_time on public.weight_logs(user_id, logged_at desc);

-- ---------- water_logs ----------
create table if not exists public.water_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  ml         integer not null,
  logged_at  timestamptz not null default now()
);
create index if not exists water_logs_user_time on public.water_logs(user_id, logged_at desc);

-- ---------- workouts (manual + preparado para wearables) ----------
create table if not exists public.workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null,
  name         text,
  duration_min integer,
  kcal_burned  numeric not null default 0,
  source       text not null default 'manual'
    check (source in ('manual','apple_health','google_health','garmin','fitbit','amazfit')),
  external_id  text,
  performed_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists workouts_user_time on public.workouts(user_id, performed_at desc);
create unique index if not exists workouts_source_external
  on public.workouts(user_id, source, external_id) where external_id is not null;

-- ---------- recipes / recipe_items ----------
create table if not exists public.recipes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  servings   integer not null default 1,
  created_at timestamptz not null default now()
);
create table if not exists public.recipe_items (
  id        uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  food_id   uuid references public.foods(id) on delete set null,
  name      text not null,
  grams     numeric not null,
  kcal      numeric not null default 0,
  protein_g numeric not null default 0,
  carb_g    numeric not null default 0,
  fat_g     numeric not null default 0
);

-- ---------- ai_messages (coach) ----------
create table if not exists public.ai_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user','assistant','system')),
  content    text not null,
  context    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_user_time on public.ai_messages(user_id, created_at);

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles     enable row level security;
alter table public.goals        enable row level security;
alter table public.foods        enable row level security;
alter table public.food_logs    enable row level security;
alter table public.log_items    enable row level security;
alter table public.weight_logs  enable row level security;
alter table public.water_logs   enable row level security;
alter table public.workouts     enable row level security;
alter table public.recipes      enable row level security;
alter table public.recipe_items enable row level security;
alter table public.ai_messages  enable row level security;

-- Políticas "own" para tablas con user_id directo.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','goals','foods','food_logs','log_items',
    'weight_logs','water_logs','workouts','recipes','ai_messages'
  ] loop
    execute format('create policy %I on public.%I for select using (user_id = auth.uid());', t||'_sel', t);
    execute format('create policy %I on public.%I for insert with check (user_id = auth.uid());', t||'_ins', t);
    execute format('create policy %I on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid());', t||'_upd', t);
    execute format('create policy %I on public.%I for delete using (user_id = auth.uid());', t||'_del', t);
  end loop;
end $$;

-- recipe_items: propiedad vía join a recipes.
create policy recipe_items_sel on public.recipe_items for select
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));
create policy recipe_items_ins on public.recipe_items for insert
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));
create policy recipe_items_upd on public.recipe_items for update
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));
create policy recipe_items_del on public.recipe_items for delete
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));

-- =====================================================================
-- Trigger: crear profile automáticamente al registrarse.
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
