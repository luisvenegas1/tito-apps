-- =====================================================================
-- Money Track — cuentas compartidas entre dos usuarios (spec §3.3–3.5, §4).
-- RLS por MEMBRESÍA (acreedor o deudor). Ninguna política de las tablas
-- privadas menciona estas tablas: la frontera de privacidad no cambia.
-- =====================================================================

create type public.shared_entry_type as enum ('charge', 'payment');

create table public.shared_accounts (
  id             uuid primary key default gen_random_uuid(),
  creditor_id    uuid not null references auth.users(id) on delete cascade,
  debtor_id      uuid references auth.users(id) on delete set null,
  creditor_label text not null check (length(trim(creditor_label)) > 0),
  debtor_label   text not null check (length(trim(debtor_label)) > 0),
  linked_card    text,
  notes          text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  check (debtor_id is null or debtor_id <> creditor_id)
);
create index on public.shared_accounts (creditor_id);
create index on public.shared_accounts (debtor_id);

create table public.shared_account_invites (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.shared_accounts(id) on delete cascade,
  email       text not null,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);
create index on public.shared_account_invites (account_id);

create table public.shared_entries (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.shared_accounts(id) on delete cascade,
  type        public.shared_entry_type not null,
  amount      numeric(14,2) not null check (amount > 0),
  currency    public.currency_code not null,
  occurred_on date not null,
  concept     text not null check (length(trim(concept)) > 0),
  note        text,
  client_uuid uuid unique,
  created_by  uuid references auth.users(id) on delete set null,
  updated_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index on public.shared_entries (account_id, occurred_on);

create table public.shared_entry_history (
  id         bigint generated always as identity primary key,
  entry_id   uuid not null references public.shared_entries(id) on delete cascade,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  action     text not null check (action in ('update', 'delete', 'restore')),
  old_row    jsonb not null
);
create index on public.shared_entry_history (entry_id);

-- ---------------------------------------------------------------------
-- Membresía (security definer para no recursar en RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_shared_member(p_account uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shared_accounts a
    where a.id = p_account and auth.uid() in (a.creditor_id, a.debtor_id)
  );
$$;

-- ---------------------------------------------------------------------
-- Triggers de integridad y auditoría
-- ---------------------------------------------------------------------
-- Los ids de membresía solo cambian vía accept_invite (que activa el flag)
-- o por acciones del sistema (auth.uid() nulo: FK on delete set null, admin).
create or replace function public.shared_accounts_guard()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null
     and coalesce(current_setting('moneytrack.accepting_invite', true), '') <> 'on'
     and (new.creditor_id <> old.creditor_id or new.debtor_id is distinct from old.debtor_id) then
    raise exception 'No se puede cambiar el acreedor ni el deudor de una cuenta compartida';
  end if;
  return new;
end;
$$;
create trigger shared_accounts_guard before update on public.shared_accounts
  for each row execute function public.shared_accounts_guard();

create or replace function public.shared_entries_before_insert()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  new.updated_by := null;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;
create trigger shared_entries_before_insert before insert on public.shared_entries
  for each row execute function public.shared_entries_before_insert();

-- security definer: escribe en shared_entry_history, que no tiene política insert.
create or replace function public.shared_entries_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_action text;
begin
  if new.account_id <> old.account_id
     or new.created_by is distinct from old.created_by
     or new.created_at <> old.created_at then
    if auth.uid() is not null then
      raise exception 'No se puede cambiar la cuenta, el autor ni la fecha de creación de un movimiento';
    end if;
  end if;

  -- Cambios hechos por el sistema (p. ej. FK set null al borrar un usuario) no se auditan.
  if auth.uid() is null then
    return new;
  end if;

  new.updated_by := auth.uid();
  new.updated_at := now();

  if old.deleted_at is null and new.deleted_at is not null then
    v_action := 'delete';
  elsif old.deleted_at is not null and new.deleted_at is null then
    v_action := 'restore';
  else
    v_action := 'update';
  end if;

  insert into public.shared_entry_history (entry_id, changed_by, action, old_row)
  values (old.id, auth.uid(), v_action, to_jsonb(old));
  return new;
end;
$$;
create trigger shared_entries_before_update before update on public.shared_entries
  for each row execute function public.shared_entries_before_update();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.shared_accounts enable row level security;
create policy shared_accounts_sel on public.shared_accounts
  for select using (auth.uid() in (creditor_id, debtor_id));
create policy shared_accounts_ins on public.shared_accounts
  for insert with check (creditor_id = auth.uid() and debtor_id is null);
create policy shared_accounts_upd on public.shared_accounts
  for update using (creditor_id = auth.uid()) with check (creditor_id = auth.uid());
-- sin delete: se archiva con is_active = false

alter table public.shared_account_invites enable row level security;
create policy invites_sel on public.shared_account_invites
  for select using (exists (select 1 from public.shared_accounts a where a.id = account_id and a.creditor_id = auth.uid()));
create policy invites_del on public.shared_account_invites
  for delete using (exists (select 1 from public.shared_accounts a where a.id = account_id and a.creditor_id = auth.uid()));
-- insert solo vía create_invite (security definer), para generar el token en el servidor

alter table public.shared_entries enable row level security;
create policy shared_entries_sel on public.shared_entries
  for select using (public.is_shared_member(account_id));
create policy shared_entries_ins on public.shared_entries
  for insert with check (public.is_shared_member(account_id));
create policy shared_entries_upd on public.shared_entries
  for update using (public.is_shared_member(account_id)) with check (public.is_shared_member(account_id));
-- sin delete: soft delete con deleted_at

alter table public.shared_entry_history enable row level security;
create policy shared_history_sel on public.shared_entry_history
  for select using (exists (
    select 1 from public.shared_entries e where e.id = entry_id and public.is_shared_member(e.account_id)
  ));

-- ---------------------------------------------------------------------
-- Saldo por cuenta y moneda (respeta RLS del que consulta)
-- ---------------------------------------------------------------------
create view public.shared_balances with (security_invoker = true) as
select e.account_id,
       e.currency,
       sum(case when e.type = 'charge' then e.amount else -e.amount end) as balance
from public.shared_entries e
where e.deleted_at is null
group by e.account_id, e.currency;

-- ---------------------------------------------------------------------
-- Invitaciones
-- ---------------------------------------------------------------------
create or replace function public.create_invite(p_account uuid, p_email text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_acc   public.shared_accounts;
begin
  select * into v_acc from public.shared_accounts where id = p_account;
  if v_acc.id is null or v_acc.creditor_id <> auth.uid() then
    raise exception 'Cuenta no encontrada';
  end if;
  if v_acc.debtor_id is not null then
    raise exception 'Esta cuenta ya está vinculada';
  end if;
  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'Correo inválido';
  end if;

  delete from public.shared_account_invites where account_id = p_account and accepted_at is null;

  v_token := encode(gen_random_bytes(24), 'hex');
  insert into public.shared_account_invites (account_id, email, token_hash, expires_at)
  values (p_account, lower(trim(p_email)), encode(digest(v_token, 'sha256'), 'hex'), now() + interval '14 days');
  return v_token;
end;
$$;

-- Vista previa pública de una invitación (sin sesión): solo nombres, nada de montos.
create or replace function public.invite_preview(p_token text)
returns table (creditor_label text, debtor_label text, email text, valid boolean)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select a.creditor_label, a.debtor_label, i.email,
         (i.accepted_at is null and i.expires_at > now() and a.debtor_id is null) as valid
  from public.shared_account_invites i
  join public.shared_accounts a on a.id = i.account_id
  where i.token_hash = encode(digest(p_token, 'sha256'), 'hex');
$$;

create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_inv public.shared_account_invites;
  v_acc public.shared_accounts;
  v_email text := lower(coalesce(auth.jwt()->>'email', ''));
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para aceptar la invitación';
  end if;

  select * into v_inv from public.shared_account_invites
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
  for update;
  if v_inv.id is null then raise exception 'Invitación no válida'; end if;
  if v_inv.accepted_at is not null then raise exception 'Esta invitación ya fue usada'; end if;
  if v_inv.expires_at <= now() then raise exception 'La invitación venció; pide una nueva'; end if;
  if v_inv.email <> v_email then
    raise exception 'Esta invitación es para %; entra con ese correo', v_inv.email;
  end if;

  select * into v_acc from public.shared_accounts where id = v_inv.account_id for update;
  if v_acc.debtor_id is not null then raise exception 'Esta cuenta ya está vinculada'; end if;
  if v_acc.creditor_id = auth.uid() then raise exception 'No puedes aceptar tu propia invitación'; end if;

  perform set_config('moneytrack.accepting_invite', 'on', true);
  update public.shared_accounts set debtor_id = auth.uid() where id = v_acc.id;
  perform set_config('moneytrack.accepting_invite', 'off', true);

  update public.shared_account_invites set accepted_at = now() where id = v_inv.id;
  return v_acc.id;
end;
$$;

revoke all on function public.create_invite(uuid, text) from public, anon;
revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.create_invite(uuid, text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.invite_preview(text) to anon, authenticated;
