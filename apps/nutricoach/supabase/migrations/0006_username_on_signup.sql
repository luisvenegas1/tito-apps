-- =====================================================================
-- NutriCoach — reservar el username DESDE el registro.
-- Antes: con confirmación de correo activada, el username escrito en el
-- signup se perdía (no había sesión para escribir en profiles) y el gate
-- lo volvía a pedir tras confirmar. Ahora el trigger de alta lo toma de
-- los metadatos del signup y lo fija de una vez, si es válido y está libre.
-- La AUTORIDAD FINAL de unicidad sigue siendo el índice único (lower(username)).
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uname     text    := nullif(trim(new.raw_user_meta_data->>'username'), '');
  uname_ok  boolean := false;
begin
  -- Aceptamos el username del signup solo si cumple formato, no es reservado
  -- y aún no lo tiene nadie. Si algo falla, lo dejamos null y el gate lo pedirá.
  if uname is not null
     and uname ~ '^[A-Za-z0-9_-]{3,24}$'
     and lower(uname) not in
       ('admin','support','nutricoach','titoapps','api','login','root','help','www',
        'contact','settings','account','soporte','ayuda')
     and not exists (select 1 from public.profiles where lower(username) = lower(uname))
  then
    uname_ok := true;
  end if;

  insert into public.profiles (user_id, full_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when uname_ok then uname else null end
  )
  on conflict (user_id) do nothing;

  return new;
end $$;

-- Resolución EXACTA case-insensitive de username -> user_id para el login.
-- (Antes el login usaba ilike, donde "_" actuaba como comodín; los usuarios
-- permiten "_", así que se comparaba mal. Esto compara por lower() exacto.)
create or replace function public.username_to_user_id(u text)
returns uuid language sql security definer set search_path = public stable as $$
  select user_id from public.profiles
  where lower(username) = lower(trim(coalesce(u, '')))
  limit 1;
$$;

revoke all on function public.username_to_user_id(text) from public, anon, authenticated;
grant execute on function public.username_to_user_id(text) to service_role;
