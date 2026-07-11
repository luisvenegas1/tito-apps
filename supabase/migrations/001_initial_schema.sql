-- ============================================================================
-- Money Track · 001_initial_schema
-- Proyecto: Money Track (organización Tito Apps) — NUEVO proyecto, independiente.
-- NO tiene relación con el proyecto SplitPay.
-- Fecha: 2026-07-10
--
-- Esta migración es 100% ADITIVA. No contiene DROP, TRUNCATE, DELETE, ni
-- ALTER ... DROP. Solo crea tipos, tablas, índices, políticas RLS, una vista
-- y dos triggers nuevos.
--
-- Referencia de diseño: docs/06-database.md y docs/14-security.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extensiones necesarias (gen_random_uuid)
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Enumeraciones (tipos)
-- ----------------------------------------------------------------------------
create type currency_code   as enum ('CRC', 'USD');

create type txn_kind        as enum (
  'expense', 'income',
  'receivable_charge', 'receivable_payment',
  'advance', 'reimbursement'
);

create type paid_by         as enum ('me', 'partner', 'shared', 'other');
create type txn_scope       as enum ('personal', 'household', 'shared');
create type recurrence_freq as enum ('monthly', 'weekly', 'biweekly', 'yearly', 'custom');
create type payment_status  as enum ('pending', 'paid', 'overdue', 'skipped');
create type goal_type       as enum ('savings', 'spend_reduction');

-- ----------------------------------------------------------------------------
-- 2. Tablas (en orden de dependencias)
-- ----------------------------------------------------------------------------

-- 2.1 profiles: extiende auth.users con preferencias
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  base_currency currency_code not null default 'CRC',
  locale        text default 'es-CR',
  created_at    timestamptz not null default now()
);

-- 2.2 people: terceros/convivientes referenciables (pareja, mamá, hermano…)
create table people (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  role       text,
  created_at timestamptz not null default now()
);

-- 2.3 categories: categorías de gasto/ingreso, con jerarquía opcional
create table categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  parent_id   uuid references categories(id) on delete set null,
  kind_hint   txn_kind default 'expense',
  icon        text,
  color       text,
  is_archived boolean not null default false,
  sort_order  int default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, name, parent_id)
);

-- 2.4 receivable_accounts: cuentas por cobrar (mamá, hermano…)
create table receivable_accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  person_id   uuid references people(id) on delete set null,
  name        text not null,
  currency    currency_code not null default 'CRC',
  linked_card text,
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 2.5 recurring_templates: plantillas de movimientos repetidos
create table recurring_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        txn_kind not null default 'expense',
  name        text not null,
  category_id uuid references categories(id) on delete set null,
  amount_est  numeric(14,2),
  currency    currency_code not null,
  paid_by     paid_by,
  scope       txn_scope,
  frequency   recurrence_freq not null default 'monthly',
  due_day     int check (due_day between 1 and 31),
  start_on    date not null,
  end_on      date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 2.6 transactions: el libro mayor (gastos, ingresos, cargos, abonos…)
create table transactions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  kind                  txn_kind not null,
  amount                numeric(14,2) not null check (amount >= 0),
  currency              currency_code not null,
  occurred_on           date not null,
  category_id           uuid references categories(id) on delete set null,
  paid_by               paid_by,
  payer_person_id       uuid references people(id) on delete set null,
  scope                 txn_scope,
  shared_split          jsonb,
  receivable_account_id uuid references receivable_accounts(id) on delete cascade,
  recurring_template_id uuid references recurring_templates(id) on delete set null,
  linked_transaction_id uuid references transactions(id) on delete set null,
  note                  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Un cargo/abono SIEMPRE cuelga de una cuenta por cobrar, y ningún otro
  -- tipo de movimiento puede colgar de una cuenta por cobrar.
  constraint receivable_needs_account check (
    (kind in ('receivable_charge','receivable_payment')) = (receivable_account_id is not null)
  )
);

create index transactions_user_date_idx  on transactions (user_id, occurred_on);
create index transactions_user_kind_idx  on transactions (user_id, kind);
create index transactions_user_cat_idx   on transactions (user_id, category_id);
create index transactions_receivable_idx on transactions (receivable_account_id);

-- 2.7 scheduled_payments: instancias generadas por una plantilla recurrente
create table scheduled_payments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  template_id    uuid not null references recurring_templates(id) on delete cascade,
  due_date       date not null,
  amount_est     numeric(14,2),
  currency       currency_code not null,
  status         payment_status not null default 'pending',
  transaction_id uuid references transactions(id) on delete set null,
  created_at     timestamptz not null default now(),
  -- Evita generar dos veces el mismo pago del mismo período (idempotencia).
  unique (template_id, due_date)
);

create index scheduled_payments_user_status_idx on scheduled_payments (user_id, status, due_date);

-- 2.8 attachments: recibos e imágenes (apuntan a Supabase Storage)
create table attachments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references transactions(id) on delete cascade,
  storage_path   text not null,
  mime_type      text,
  created_at     timestamptz not null default now()
);

-- 2.9 exchange_rates: tipo de cambio configurable con vigencia
create table exchange_rates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  from_ccy   currency_code not null,
  to_ccy     currency_code not null,
  rate       numeric(14,6) not null check (rate > 0),
  valid_from date not null default current_date,
  created_at timestamptz not null default now(),
  -- No tiene sentido un tipo de cambio de una moneda a sí misma.
  constraint exchange_rate_distinct_ccy check (from_ccy <> to_ccy)
);

-- 2.10 goals: metas de ahorro y de reducción de gasto
create table goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          goal_type not null,
  name          text not null,
  category_id   uuid references categories(id) on delete set null,
  target_amount numeric(14,2),
  currency      currency_code not null default 'CRC',
  target_date   date,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- 2.11 notifications: recordatorios y alertas
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  ref_table  text,
  ref_id     uuid,
  due_at     timestamptz,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. Vista: saldo de cuentas por cobrar (se calcula, nunca se almacena)
--    security_invoker = true → la vista respeta el RLS de las tablas base,
--    de modo que cada usuario solo ve el saldo de sus propias cuentas.
-- ----------------------------------------------------------------------------
create view receivable_balances
  with (security_invoker = true)
as
select
  ra.id       as receivable_account_id,
  ra.user_id  as user_id,
  ra.name     as name,
  ra.currency as currency,
  coalesce(sum(case when t.kind = 'receivable_charge'  then t.amount else 0 end), 0)
  - coalesce(sum(case when t.kind = 'receivable_payment' then t.amount else 0 end), 0)
              as balance
from receivable_accounts ra
left join transactions t on t.receivable_account_id = ra.id
group by ra.id, ra.user_id, ra.name, ra.currency;

-- ----------------------------------------------------------------------------
-- 4. Función + trigger: mantener updated_at en transactions
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_transactions_updated_at
  before update on transactions
  for each row
  execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Función + trigger: alta automática de perfil + categorías semilla
--    al registrarse un usuario. Único objeto que referencia el esquema auth;
--    es ADITIVO (un trigger AFTER INSERT), no altera nada existente.
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');

  insert into public.categories (user_id, name, sort_order) values
    (new.id, 'Préstamo casa', 1),
    (new.id, 'Condominio', 2),
    (new.id, 'Luz', 3),
    (new.id, 'Teléfono', 4),
    (new.id, 'Carro', 5),
    (new.id, 'Seguros', 6),
    (new.id, 'Tarjetas de crédito', 7),
    (new.id, 'Fútbol', 8),
    (new.id, 'Pensión complementaria', 9),
    (new.id, 'Gastos personales', 10),
    (new.id, 'Comida', 11),
    (new.id, 'Restaurantes', 12);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- 6. Row Level Security
--    Se ACTIVA en todas las tablas de negocio y se crean 4 políticas por tabla
--    (select / insert / update / delete) que limitan cada operación a las
--    filas del propio usuario. profiles usa su columna id (que ES el user id).
-- ----------------------------------------------------------------------------

-- 6.1 profiles
alter table profiles enable row level security;
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on profiles for delete using (auth.uid() = id);

-- 6.2 people
alter table people enable row level security;
create policy "people_select_own" on people for select using (auth.uid() = user_id);
create policy "people_insert_own" on people for insert with check (auth.uid() = user_id);
create policy "people_update_own" on people for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "people_delete_own" on people for delete using (auth.uid() = user_id);

-- 6.3 categories
alter table categories enable row level security;
create policy "categories_select_own" on categories for select using (auth.uid() = user_id);
create policy "categories_insert_own" on categories for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on categories for delete using (auth.uid() = user_id);

-- 6.4 receivable_accounts
alter table receivable_accounts enable row level security;
create policy "receivable_accounts_select_own" on receivable_accounts for select using (auth.uid() = user_id);
create policy "receivable_accounts_insert_own" on receivable_accounts for insert with check (auth.uid() = user_id);
create policy "receivable_accounts_update_own" on receivable_accounts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "receivable_accounts_delete_own" on receivable_accounts for delete using (auth.uid() = user_id);

-- 6.5 recurring_templates
alter table recurring_templates enable row level security;
create policy "recurring_templates_select_own" on recurring_templates for select using (auth.uid() = user_id);
create policy "recurring_templates_insert_own" on recurring_templates for insert with check (auth.uid() = user_id);
create policy "recurring_templates_update_own" on recurring_templates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recurring_templates_delete_own" on recurring_templates for delete using (auth.uid() = user_id);

-- 6.6 transactions
alter table transactions enable row level security;
create policy "transactions_select_own" on transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on transactions for delete using (auth.uid() = user_id);

-- 6.7 scheduled_payments
alter table scheduled_payments enable row level security;
create policy "scheduled_payments_select_own" on scheduled_payments for select using (auth.uid() = user_id);
create policy "scheduled_payments_insert_own" on scheduled_payments for insert with check (auth.uid() = user_id);
create policy "scheduled_payments_update_own" on scheduled_payments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scheduled_payments_delete_own" on scheduled_payments for delete using (auth.uid() = user_id);

-- 6.8 attachments
alter table attachments enable row level security;
create policy "attachments_select_own" on attachments for select using (auth.uid() = user_id);
create policy "attachments_insert_own" on attachments for insert with check (auth.uid() = user_id);
create policy "attachments_update_own" on attachments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "attachments_delete_own" on attachments for delete using (auth.uid() = user_id);

-- 6.9 exchange_rates
alter table exchange_rates enable row level security;
create policy "exchange_rates_select_own" on exchange_rates for select using (auth.uid() = user_id);
create policy "exchange_rates_insert_own" on exchange_rates for insert with check (auth.uid() = user_id);
create policy "exchange_rates_update_own" on exchange_rates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exchange_rates_delete_own" on exchange_rates for delete using (auth.uid() = user_id);

-- 6.10 goals
alter table goals enable row level security;
create policy "goals_select_own" on goals for select using (auth.uid() = user_id);
create policy "goals_insert_own" on goals for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals_delete_own" on goals for delete using (auth.uid() = user_id);

-- 6.11 notifications
alter table notifications enable row level security;
create policy "notifications_select_own" on notifications for select using (auth.uid() = user_id);
create policy "notifications_insert_own" on notifications for insert with check (auth.uid() = user_id);
create policy "notifications_update_own" on notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_delete_own" on notifications for delete using (auth.uid() = user_id);

-- ============================================================================
-- Fin de 001_initial_schema.
-- Resumen: 7 enums · 11 tablas · 1 vista · 2 funciones · 2 triggers ·
--          RLS en las 11 tablas (44 políticas) · 0 instrucciones destructivas.
-- ============================================================================
