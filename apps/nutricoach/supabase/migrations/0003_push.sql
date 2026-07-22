-- =====================================================================
-- NutriCoach — Web Push: suscripciones + configuración de recordatorios.
-- Permite enviar notificaciones con la app cerrada (cron server-side).
-- =====================================================================

-- Config de recordatorios en el perfil (fuente de verdad para el servidor).
alter table public.profiles add column if not exists reminder_enabled  boolean not null default false;
alter table public.profiles add column if not exists reminder_time     text    not null default '18:00';
alter table public.profiles add column if not exists reminder_water    boolean not null default true;
alter table public.profiles add column if not exists reminder_protein  boolean not null default true;
alter table public.profiles add column if not exists reminder_calories boolean not null default false;
alter table public.profiles add column if not exists reminder_tz       text    not null default 'America/Costa_Rica';
alter table public.profiles add column if not exists reminder_last_sent date;

-- Suscripciones push (una por dispositivo/navegador).
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  unique (endpoint)
);
create index if not exists push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_sel on public.push_subscriptions
  for select using (user_id = auth.uid());
create policy push_subscriptions_ins on public.push_subscriptions
  for insert with check (user_id = auth.uid());
create policy push_subscriptions_upd on public.push_subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_subscriptions_del on public.push_subscriptions
  for delete using (user_id = auth.uid());
