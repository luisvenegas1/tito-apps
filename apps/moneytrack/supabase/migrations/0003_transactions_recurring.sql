-- =====================================================================
-- Money Track — libro privado (transactions), recurrencia y próximos pagos.
-- =====================================================================

create type public.recurrence_freq as enum ('monthly', 'weekly', 'biweekly', 'yearly');
create type public.payment_status  as enum ('pending', 'paid', 'skipped');
-- "atrasado" no se guarda: es pending con due_date < hoy (se calcula al leer).

create table public.recurring_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        public.txn_kind not null default 'expense',
  name        text not null check (length(trim(name)) > 0),
  category_id uuid references public.categories(id) on delete set null,
  amount_est  numeric(14,2) check (amount_est is null or amount_est >= 0),
  currency    public.currency_code not null default 'CRC',
  paid_by     public.paid_by not null default 'me',
  scope       public.txn_scope not null default 'personal',
  frequency   public.recurrence_freq not null default 'monthly',
  due_day     int check (due_day between 1 and 31),
  start_on    date not null default current_date,
  end_on      date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on public.recurring_templates (user_id);

create table public.transactions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  kind                  public.txn_kind not null,
  amount                numeric(14,2) not null check (amount > 0),
  currency              public.currency_code not null,
  occurred_on           date not null default current_date,
  category_id           uuid references public.categories(id) on delete set null,
  paid_by               public.paid_by not null default 'me',
  payer_person_id       uuid references public.people(id) on delete set null,
  scope                 public.txn_scope not null default 'personal',
  my_share              numeric(4,3) not null default 0.5 check (my_share between 0 and 1), -- usado si paid_by = 'shared'
  -- Tipo de cambio CONGELADO del día del movimiento (colones por unidad). Nulo en colones.
  -- Si el cliente no lo manda, el trigger lo toma del historial a la fecha del movimiento.
  fx_rate               numeric(12,4) check (fx_rate is null or fx_rate > 0),
  shared_entry_id       uuid references public.shared_entries(id) on delete set null,
  recurring_template_id uuid references public.recurring_templates(id) on delete set null,
  linked_transaction_id uuid references public.transactions(id) on delete set null, -- adelanto ↔ reembolso
  note                  text,
  tags                  text[] not null default '{}',
  client_uuid           uuid unique,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id, shared_entry_id)
);
create index on public.transactions (user_id, occurred_on);
create index on public.transactions (user_id, kind);
create index on public.transactions (user_id, category_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger transactions_touch before update on public.transactions
  for each row execute function public.touch_updated_at();

-- Colones por unidad vigentes en una fecha para un usuario (compra o venta).
-- Junta los manuales del usuario con la referencia del BCCR (si la usa).
-- Gana el último con fecha <= p_date (en empate, el manual); si no hay
-- ninguno anterior, el más antiguo disponible.
create or replace function public.rate_on(p_user uuid, p_currency public.currency_code, p_date date, p_buy boolean)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with candidates as (
    select valid_from as d, buy, sell, 1 as prio
    from public.exchange_rates where user_id = p_user and currency = p_currency
    union all
    select rate_date, buy, sell, 0
    from public.reference_rates
    where currency = p_currency
      and coalesce((select auto_rates from public.profiles where id = p_user), true)
  )
  select case when p_buy then buy else sell end
  from candidates
  order by (d <= p_date) desc,
           case when d <= p_date then d end desc nulls last,
           prio desc,
           d asc
  limit 1;
$$;
revoke all on function public.rate_on(uuid, public.currency_code, date, boolean) from public, anon, authenticated;

-- Congela el TC al guardar: ingresos/reembolsos con compra, el resto con venta.
-- security definer: llama a rate_on, que el cliente no puede ejecutar directamente.
create or replace function public.transactions_fx()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.currency = 'CRC' then
    new.fx_rate := null;
  elsif new.fx_rate is null then
    new.fx_rate := public.rate_on(new.user_id, new.currency, new.occurred_on, new.kind in ('income', 'reimbursement'));
  end if;
  return new;
end;
$$;
create trigger transactions_fx before insert or update on public.transactions
  for each row execute function public.transactions_fx();

create table public.scheduled_payments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  template_id    uuid not null references public.recurring_templates(id) on delete cascade,
  due_date       date not null,
  amount_est     numeric(14,2),
  currency       public.currency_code not null,
  status         public.payment_status not null default 'pending',
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (template_id, due_date)
);
create index on public.scheduled_payments (user_id, status, due_date);

create table public.attachments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  storage_path   text not null,
  mime_type      text,
  created_at     timestamptz not null default now()
);
create index on public.attachments (transaction_id);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['recurring_templates', 'scheduled_payments', 'attachments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (user_id = auth.uid())', t || '_sel', t);
    execute format('create policy %I on public.%I for insert with check (user_id = auth.uid())', t || '_ins', t);
    execute format('create policy %I on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_upd', t);
    execute format('create policy %I on public.%I for delete using (user_id = auth.uid())', t || '_del', t);
  end loop;
end $$;

-- transactions: además, solo se puede ligar a un cargo de una cuenta de la que soy miembro.
alter table public.transactions enable row level security;
create policy transactions_sel on public.transactions for select using (user_id = auth.uid());
create policy transactions_ins on public.transactions for insert with check (
  user_id = auth.uid()
  and (shared_entry_id is null or exists (
    select 1 from public.shared_entries e where e.id = shared_entry_id and public.is_shared_member(e.account_id)))
);
create policy transactions_upd on public.transactions for update using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and (shared_entry_id is null or exists (
    select 1 from public.shared_entries e where e.id = shared_entry_id and public.is_shared_member(e.account_id)))
);
create policy transactions_del on public.transactions for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Cuenta compartida ↔ gastos de la deudora
-- ---------------------------------------------------------------------
-- Cargo en el libro + movimiento propio ligado, en una sola transacción:
--   deudora, kind 'expense': "Compré con la extensión" (es SU gasto).
--   acreedor, kind 'advance': "Lo pagué con mi dinero" (sale de mi bolsillo, pero
--   no es gasto mío: me lo deben; aparece en mis movimientos sin contar en totales).
create or replace function public.charge_and_expense(
  p_account uuid, p_amount numeric, p_currency public.currency_code, p_date date,
  p_concept text, p_category uuid, p_note text default null, p_client_uuid uuid default null,
  p_kind public.txn_kind default 'expense'
) returns uuid
language plpgsql
as $$
declare v_entry uuid;
begin
  if p_kind not in ('expense', 'advance') then
    raise exception 'Tipo no permitido para un cargo';
  end if;

  insert into public.shared_entries (account_id, type, amount, currency, occurred_on, concept, note, client_uuid)
  values (p_account, 'charge', p_amount, p_currency, p_date, p_concept, p_note, p_client_uuid)
  returning id into v_entry;

  insert into public.transactions (user_id, kind, amount, currency, occurred_on, category_id, note, shared_entry_id)
  values (auth.uid(), p_kind, p_amount, p_currency, p_date, p_category, p_concept, v_entry);
  return v_entry;
end;
$$;

create or replace function public.add_charge_to_expenses(p_entry uuid, p_category uuid)
returns uuid
language plpgsql
as $$
declare
  v_e  public.shared_entries;
  v_tx uuid;
begin
  select * into v_e from public.shared_entries where id = p_entry and deleted_at is null;
  if v_e.id is null then raise exception 'Movimiento no encontrado'; end if;
  if v_e.type <> 'charge' then raise exception 'Solo los cargos se pasan a gastos'; end if;

  insert into public.transactions (user_id, kind, amount, currency, occurred_on, category_id, note, shared_entry_id)
  values (auth.uid(), 'expense', v_e.amount, v_e.currency, v_e.occurred_on, p_category, v_e.concept, v_e.id)
  returning id into v_tx;
  return v_tx;
end;
$$;

-- ---------------------------------------------------------------------
-- Recurrencia
-- ---------------------------------------------------------------------
create or replace function public.occurrence_date(p_freq public.recurrence_freq, p_start date, p_due_day int, p_n int)
returns date
language sql
immutable
as $$
  select case p_freq
    when 'weekly'   then p_start + (7 * p_n)
    when 'biweekly' then p_start + (14 * p_n)
    when 'monthly'  then (
      select make_date(extract(year from m)::int, extract(month from m)::int,
                       least(coalesce(p_due_day, extract(day from p_start)::int),
                             extract(day from (m + interval '1 month - 1 day'))::int))
      from (select (date_trunc('month', p_start) + make_interval(months => p_n))::date as m) x)
    when 'yearly'   then (
      select make_date(extract(year from m)::int, extract(month from m)::int,
                       least(coalesce(p_due_day, extract(day from p_start)::int),
                             extract(day from (m + interval '1 month - 1 day'))::int))
      from (select (date_trunc('month', p_start) + make_interval(years => p_n))::date as m) x)
  end;
$$;

-- Genera las instancias pendientes hasta p_until. Idempotente (unique template_id, due_date).
-- Llamada por el usuario: solo sus plantillas (RLS + filtro). Por pg_cron (auth.uid() nulo): todas.
create or replace function public.generate_scheduled_payments(p_until date default current_date + 45)
returns int
language plpgsql
as $$
declare
  t       public.recurring_templates;
  d       date;
  n       int;
  v_from  date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_count int := 0;
  v_rows  int;
begin
  for t in
    select * from public.recurring_templates
    where is_active and (auth.uid() is null or user_id = auth.uid())
  loop
    n := 0;
    loop
      d := public.occurrence_date(t.frequency, t.start_on, t.due_day, n);
      exit when d > p_until or (t.end_on is not null and d > t.end_on) or n > 1000;
      if d >= v_from and d >= t.start_on then
        insert into public.scheduled_payments (user_id, template_id, due_date, amount_est, currency)
        values (t.user_id, t.id, d, t.amount_est, t.currency)
        on conflict (template_id, due_date) do nothing;
        get diagnostics v_rows = row_count;
        v_count := v_count + v_rows;
      end if;
      n := n + 1;
    end loop;
  end loop;
  return v_count;
end;
$$;

-- Marcar pagado: crea la transacción real (monto real) y la enlaza.
create or replace function public.pay_scheduled_payment(p_id uuid, p_amount numeric, p_date date default current_date)
returns uuid
language plpgsql
as $$
declare
  sp public.scheduled_payments;
  t  public.recurring_templates;
  v_tx uuid;
begin
  select * into sp from public.scheduled_payments where id = p_id and user_id = auth.uid();
  if sp.id is null then raise exception 'Pago no encontrado'; end if;
  if sp.status = 'paid' then raise exception 'Este pago ya está marcado como pagado'; end if;
  select * into t from public.recurring_templates where id = sp.template_id;

  insert into public.transactions (user_id, kind, amount, currency, occurred_on, category_id, paid_by, scope, note, recurring_template_id)
  values (auth.uid(), t.kind, p_amount, sp.currency, p_date, t.category_id, t.paid_by, t.scope, t.name, t.id)
  returning id into v_tx;

  update public.scheduled_payments set status = 'paid', transaction_id = v_tx where id = sp.id;
  return v_tx;
end;
$$;
