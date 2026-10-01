-- =====================================================================
-- Money Track — núcleo privado por usuario.
-- Spec: docs/superpowers/specs/2026-09-30-moneytrack-design.md (§3.1–3.2)
-- Todo lo de este archivo es PRIVADO: RLS auth.uid() = user_id.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

create type public.currency_code as enum ('CRC', 'USD');
create type public.txn_kind      as enum ('expense', 'income', 'advance', 'reimbursement');
create type public.paid_by       as enum ('me', 'partner', 'shared', 'other');
create type public.txn_scope     as enum ('personal', 'household', 'shared');

-- ---------------------------------------------------------------------
-- profiles (1:1 con auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  display_name         text,
  base_currency        public.currency_code not null default 'CRC',
  locale               text not null default 'es-CR',
  onboarded            boolean not null default false,
  reminder_days_before int not null default 2 check (reminder_days_before between 0 and 14),
  push_enabled         boolean not null default false,
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- people: pareja y terceros SIN cuenta (referencias, no dan acceso)
-- ---------------------------------------------------------------------
create table public.people (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  role       text,
  created_at timestamptz not null default now()
);
create index on public.people (user_id);

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  parent_id   uuid references public.categories(id) on delete set null,
  kind_hint   public.txn_kind not null default 'expense',
  icon        text,
  color       text,
  is_archived boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create unique index categories_user_name on public.categories (user_id, lower(name));

-- ---------------------------------------------------------------------
-- exchange_rates: colones por dólar, con vigencia
-- ---------------------------------------------------------------------
create table public.exchange_rates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  crc_per_usd numeric(12,4) not null check (crc_per_usd > 0),
  valid_from  date not null default current_date,
  created_at  timestamptz not null default now(),
  unique (user_id, valid_from)
);

-- ---------------------------------------------------------------------
-- RLS "solo el dueño" para todas las tablas privadas
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
create policy profiles_sel on public.profiles for select using (id = auth.uid());
create policy profiles_upd on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['people', 'categories', 'exchange_rates'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (user_id = auth.uid())', t || '_sel', t);
    execute format('create policy %I on public.%I for insert with check (user_id = auth.uid())', t || '_ins', t);
    execute format('create policy %I on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_upd', t);
    execute format('create policy %I on public.%I for delete using (user_id = auth.uid())', t || '_del', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Alta de usuario: perfil + categorías semilla + TC inicial
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)));

  insert into public.categories (user_id, name, kind_hint, icon, sort_order)
  select new.id, c.name, c.kind::public.txn_kind, c.icon, c.ord
  from (values
    ('Préstamo casa',          'expense', '🏠', 1),
    ('Condominio',             'expense', '🏢', 2),
    ('Luz',                    'expense', '💡', 3),
    ('Agua',                   'expense', '🚰', 4),
    ('Teléfono e internet',    'expense', '📱', 5),
    ('Carro',                  'expense', '🚗', 6),
    ('Seguros',                'expense', '🛡️', 7),
    ('Tarjetas de crédito',    'expense', '💳', 8),
    ('Fútbol',                 'expense', '⚽', 9),
    ('Pensión complementaria', 'expense', '🧓', 10),
    ('Súper',                  'expense', '🛒', 11),
    ('Restaurantes',           'expense', '🍽️', 12),
    ('Salud',                  'expense', '💊', 13),
    ('Gastos personales',      'expense', '🛍️', 14),
    ('Otros gastos',           'expense', '📦', 15),
    ('Salario',                'income',  '💼', 20),
    ('Otros ingresos',         'income',  '💰', 21)
  ) as c(name, kind, icon, ord);

  insert into public.exchange_rates (user_id, crc_per_usd, valid_from)
  values (new.id, 505, current_date);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
