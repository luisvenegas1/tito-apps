-- =====================================================================
-- NutriCoach — username + nombre (login por correo o usuario).
-- Igual que GolPay (0006_username.sql), adaptado al esquema keyed por user_id.
-- La AUTORIDAD FINAL de unicidad es el índice único case-insensitive.
-- =====================================================================

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists full_name text;

-- Unicidad case-insensitive: "Tito" == "tito" == "TITO".
create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

-- Formato: 3–24, letras/números/guion/guion bajo, sin espacios.
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[A-Za-z0-9_-]{3,24}$');

-- Palabras reservadas (bloqueadas también en el frontend).
alter table public.profiles drop constraint if exists profiles_username_reserved;
alter table public.profiles add constraint profiles_username_reserved
  check (
    username is null or lower(username) not in
    ('admin','support','nutricoach','titoapps','api','login','root','help','www',
     'contact','settings','account','soporte','ayuda')
  );

-- Disponibilidad (sin exponer datos): true si es válido y está libre.
create or replace function public.username_available(u text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v text := lower(trim(coalesce(u, '')));
begin
  if v = '' then return false; end if;
  if u !~ '^[A-Za-z0-9_-]{3,24}$' then return false; end if;
  if v in ('admin','support','nutricoach','titoapps','api','login','root','help','www',
           'contact','settings','account','soporte','ayuda') then
    return false;
  end if;
  return not exists (select 1 from public.profiles where lower(username) = v);
end;
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- El trigger de alta ahora copia el nombre desde los metadatos del signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (user_id) do nothing;
  return new;
end $$;
