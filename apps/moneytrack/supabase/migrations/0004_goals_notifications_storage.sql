-- =====================================================================
-- Money Track — metas, notificaciones (in-app + Web Push) y recibos.
-- =====================================================================

create type public.goal_type as enum ('savings', 'spend_reduction');

create table public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          public.goal_type not null,
  name          text not null check (length(trim(name)) > 0),
  category_id   uuid references public.categories(id) on delete set null, -- spend_reduction: límite mensual de la categoría
  target_amount numeric(14,2) not null check (target_amount > 0),
  saved_amount  numeric(14,2) not null default 0 check (saved_amount >= 0), -- savings: lo apartado
  currency      public.currency_code not null default 'CRC',
  target_date   date,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  check (type <> 'spend_reduction' or category_id is not null)
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,          -- 'payment_due' | 'payment_overdue'
  title      text not null,
  body       text,
  url        text,
  ref_id     uuid,
  read_at    timestamptz,
  pushed_at  timestamptz,          -- enviada por Web Push (notify-due)
  created_at timestamptz not null default now(),
  unique (user_id, type, ref_id)     -- no repetir el mismo aviso
);
create index on public.notifications (user_id, created_at desc);

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);

do $$
declare t text;
begin
  foreach t in array array['goals', 'notifications', 'push_subscriptions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (user_id = auth.uid())', t || '_sel', t);
    execute format('create policy %I on public.%I for insert with check (user_id = auth.uid())', t || '_ins', t);
    execute format('create policy %I on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_upd', t);
    execute format('create policy %I on public.%I for delete using (user_id = auth.uid())', t || '_del', t);
  end loop;
end $$;

-- Avisos de vencimiento (in-app). Corre por pg_cron; la Edge Function notify-due
-- los reenvía como Web Push. Idempotente gracias a unique (user_id, type, ref_id).
create or replace function public.build_due_notifications()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_rows int;
begin
  insert into public.notifications (user_id, type, title, body, url, ref_id)
  select sp.user_id,
         case when sp.due_date < current_date then 'payment_overdue' else 'payment_due' end,
         case when sp.due_date < current_date then 'Pago atrasado: ' || t.name
              when sp.due_date = current_date then 'Vence hoy: ' || t.name
              when sp.due_date = current_date + 1 then 'Vence mañana: ' || t.name
              else 'Vence el ' || to_char(sp.due_date, 'DD/MM') || ': ' || t.name end,
         case when sp.amount_est is null then null
              when sp.currency = 'CRC' then '₡' || replace(to_char(round(sp.amount_est), 'FM999,999,999,999'), ',', '.')
              else '$' || translate(to_char(sp.amount_est, 'FM999,999,999,990.00'), ',.', '.,') end,
         '/pagos',
         sp.id
  from public.scheduled_payments sp
  join public.recurring_templates t on t.id = sp.template_id
  join public.profiles p on p.id = sp.user_id
  where sp.status = 'pending'
    and sp.due_date <= current_date + p.reminder_days_before
  on conflict (user_id, type, ref_id) do nothing;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;
revoke all on function public.build_due_notifications() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Recibos: bucket privado, carpeta por usuario (<uid>/<archivo>)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy receipts_sel on storage.objects for select
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy receipts_ins on storage.objects for insert
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy receipts_del on storage.objects for delete
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
