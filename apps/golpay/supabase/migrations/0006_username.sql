-- =====================================================================
-- Username del organizador (login por email o username).
-- La AUTORIDAD FINAL de unicidad es el índice único case-insensitive.
-- =====================================================================

alter table profiles add column if not exists username text;

-- Unicidad case-insensitive: "Tito" == "tito" == "TITO".
create unique index if not exists profiles_username_lower_key on profiles (lower(username));

-- Formato: 3–24, letras/números/guion/guion bajo, sin espacios.
alter table profiles drop constraint if exists profiles_username_format;
alter table profiles add constraint profiles_username_format
  check (username is null or username ~ '^[A-Za-z0-9_-]{3,24}$');

-- Palabras reservadas (bloqueadas también en frontend).
alter table profiles drop constraint if exists profiles_username_reserved;
alter table profiles add constraint profiles_username_reserved
  check (
    username is null or lower(username) not in
    ('admin','support','golpay','titoapps','api','login','root','help','www',
     'contact','settings','account','soporte','ayuda')
  );

-- Disponibilidad (sin exponer datos): true si es válido y está libre.
create or replace function username_available(u text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v text := lower(trim(coalesce(u, '')));
begin
  if v = '' then return false; end if;
  if u !~ '^[A-Za-z0-9_-]{3,24}$' then return false; end if;
  if v in ('admin','support','golpay','titoapps','api','login','root','help','www',
           'contact','settings','account','soporte','ayuda') then
    return false;
  end if;
  return not exists (select 1 from profiles where lower(username) = v);
end;
$$;

revoke all on function username_available(text) from public;
grant execute on function username_available(text) to anon, authenticated;
