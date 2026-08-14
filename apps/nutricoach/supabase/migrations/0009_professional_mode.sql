-- =====================================================================
-- NutriCoach — MODO "Seguimiento Profesional" (0009)
-- Convive con el modo Personal en la misma app y cuenta. Añade:
--   - profiles.nutrition_mode            → qué experiencia ve el usuario
--   - plan_categories                    → plan por intercambios/porciones (flexible)
--   - exchange_entries                   → intercambios consumidos por día
--   - user_badges                        → gamificación (catálogo en el código)
-- El progreso diario, cumplimiento y rachas se CALCULAN (no se guardan tablas).
-- Preparado para FASE 2 (nutricionista): plan_categories.source / assigned_by.
-- =====================================================================

-- ---------- profiles: modo de uso ----------
-- null = aún no elegido (el onboarding muestra el selector una vez).
alter table public.profiles
  add column if not exists nutrition_mode text
  check (nutrition_mode in ('personal', 'professional'));

-- ---------- plan_categories (el "plan" = conjunto de categorías) ----------
create table if not exists public.plan_categories (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  emoji              text,
  daily_target       numeric not null default 0,           -- permite fracciones
  unit               text not null default 'manual'
                       check (unit in ('carb_g','protein_g','fat_g','kcal','manual')),
  grams_per_exchange numeric,                                -- equivalencia opcional
  notes              text,                                   -- reglas/equivalencias en texto
  is_active          boolean not null default true,
  sort_order         integer not null default 0,
  -- FASE 2: cuando una nutricionista asigne el plan.
  source             text not null default 'self'
                       check (source in ('self','professional')),
  assigned_by        uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists plan_categories_user on public.plan_categories(user_id, sort_order);
create trigger trg_plan_categories_updated before update on public.plan_categories
  for each row execute function public.set_updated_at();

-- ---------- exchange_entries (intercambios consumidos) ----------
-- Unidad atómica. Una "comida" = varias filas con el mismo name/meal; un
-- intercambio rápido = una fila suelta. amount permite 0.5 / 1.5 / …
create table if not exists public.exchange_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  category_id  uuid not null references public.plan_categories(id) on delete cascade,
  log_date     date not null,
  amount       numeric not null default 1,
  name         text,
  meal         text check (meal in ('breakfast','lunch','dinner','snack')),
  source       text not null default 'quick'
                 check (source in ('quick','manual','text','photo','scale','label','barcode','ai')),
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists exchange_entries_user_date on public.exchange_entries(user_id, log_date);
create index if not exists exchange_entries_category on public.exchange_entries(category_id);

-- ---------- user_badges (gamificación) ----------
create table if not exists public.user_badges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  badge_id   text not null,
  earned_at  timestamptz not null default now(),
  unique (user_id, badge_id)
);
create index if not exists user_badges_user on public.user_badges(user_id);

-- =====================================================================
-- RLS (mismo patrón "own" que 0001; un usuario nunca ve datos de otro)
-- =====================================================================
alter table public.plan_categories  enable row level security;
alter table public.exchange_entries enable row level security;
alter table public.user_badges      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['plan_categories','exchange_entries','user_badges'] loop
    execute format('create policy %I on public.%I for select using (user_id = auth.uid());', t||'_sel', t);
    execute format('create policy %I on public.%I for insert with check (user_id = auth.uid());', t||'_ins', t);
    execute format('create policy %I on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid());', t||'_upd', t);
    execute format('create policy %I on public.%I for delete using (user_id = auth.uid());', t||'_del', t);
  end loop;
end $$;
