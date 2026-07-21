-- =====================================================================
--  GRUPOS
--
--  Hasta ahora todo colgaba de owner_id = auth.uid(): los partidos y los
--  jugadores eran de una sola persona. Con grupos, Ale puede aprobar pagos
--  de un partido que creaste vos y Sebas puede armar los equipos, sin volver
--  a cargar los 24 jugadores.
--
--  Modelo elegido (opción A del plan): cada grupo tiene su propia ficha del
--  jugador, y person_id une a la misma persona entre grupos. Así el nivel y
--  la posición quedan por grupo sin tocar ninguna consulta existente.
--
--  ANTES DE CORRER: hacé backup (Supabase → Database → Backups) y no cargues
--  partidos nuevos hasta terminar. Esta migración toca todas las tablas.
-- =====================================================================

-- ---------------------------------------------------------------
-- 1. Tablas nuevas
-- ---------------------------------------------------------------
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  -- 'owner' puede eliminar el grupo y quitar miembros. Para todo lo demás
  -- owner y admin son iguales: adentro se puede todo.
  role text not null default 'admin' check (role in ('owner', 'admin')),
  added_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on group_members (user_id);

create table if not exists group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  -- Para acordarte a quién se la mandaste ("Ale", "Sebas").
  label text,
  invited_by uuid not null references profiles(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists group_invites_group_idx on group_invites (group_id);

-- ---------------------------------------------------------------
-- 2. Columnas nuevas (nullable por ahora: primero hay que llenarlas)
-- ---------------------------------------------------------------
alter table matches           add column if not exists group_id uuid references groups(id) on delete cascade;
alter table frequent_players  add column if not exists group_id uuid references groups(id) on delete cascade;
-- Misma persona en distintos grupos.
alter table frequent_players  add column if not exists person_id uuid;

-- ---------------------------------------------------------------
-- 3. Migrar lo que ya existe
--    Un grupo por cada perfil que tenga datos; su dueño queda de owner.
-- ---------------------------------------------------------------
insert into groups (name, created_by)
select 'Mi grupo', p.id
  from profiles p
 where not exists (select 1 from groups g where g.created_by = p.id)
   and (
     exists (select 1 from matches m where m.owner_id = p.id)
     or exists (select 1 from frequent_players f where f.owner_id = p.id)
   );

insert into group_members (group_id, user_id, role, added_by)
select g.id, g.created_by, 'owner', g.created_by
  from groups g
 where not exists (
   select 1 from group_members gm
    where gm.group_id = g.id and gm.user_id = g.created_by
 );

-- Ojo: si el usuario ya tiene más de un grupo (porque creó otros después),
-- "el grupo de su owner_id" sería ambiguo. Tomamos siempre el más viejo, que
-- es el que creó esta misma migración.
with grupo_original as (
  select distinct on (created_by) created_by, id
    from groups
   order by created_by, created_at, id
)
update matches m
   set group_id = go.id
  from grupo_original go
 where go.created_by = m.owner_id
   and m.group_id is null;

with grupo_original as (
  select distinct on (created_by) created_by, id
    from groups
   order by created_by, created_at, id
)
update frequent_players f
   set group_id = go.id
  from grupo_original go
 where go.created_by = f.owner_id
   and f.group_id is null;

-- Cada jugador es, por ahora, su propia identidad.
update frequent_players set person_id = id where person_id is null;

-- ---------------------------------------------------------------
-- 4. Ahora sí, obligatorias
-- ---------------------------------------------------------------
alter table matches           alter column group_id set not null;
alter table frequent_players  alter column group_id set not null;
alter table frequent_players  alter column person_id set not null;

create index if not exists matches_group_idx          on matches (group_id);
create index if not exists frequent_players_group_idx on frequent_players (group_id);
create index if not exists frequent_players_person_idx on frequent_players (person_id);

-- El índice anti-duplicados pasa de (owner_id) a (group_id): mismo mecanismo,
-- ahora por grupo. Un jugador puede repetirse ENTRE grupos, no dentro.
drop index if exists frequent_players_owner_name_unique;
create unique index if not exists frequent_players_group_name_unique
  on frequent_players (group_id, name_norm);

-- La misma persona no puede estar dos veces en el mismo grupo.
create unique index if not exists frequent_players_group_person_unique
  on frequent_players (group_id, person_id);

-- owner_id se queda por ahora: si algo sale mal, permite reconstruir.
-- Se elimina en una migración posterior, cuando esto esté rodado.

-- ---------------------------------------------------------------
-- 5. ¿Soy miembro de este grupo?
--    security definer para que la política de group_members no se consulte
--    a sí misma (recursión infinita en RLS).
-- ---------------------------------------------------------------
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from group_members
     where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from group_members
     where group_id = gid and user_id = auth.uid() and role = 'owner'
  );
$$;

revoke all on function public.is_group_member(uuid) from public;
revoke all on function public.is_group_owner(uuid)  from public;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_owner(uuid)  to authenticated;

-- ---------------------------------------------------------------
-- 6. Aceptar una invitación
--    Toda la validación vive acá: si estuviera en el frontend, bastaría
--    llamar a la API directo para saltársela.
-- ---------------------------------------------------------------
create or replace function public.accept_group_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite group_invites;
begin
  -- Sin sesión no hay permisos. Nunca.
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión para aceptar la invitación';
  end if;

  select * into v_invite from group_invites where token = p_token;
  if not found then
    raise exception 'Invitación no válida';
  end if;
  if v_invite.revoked_at is not null then
    raise exception 'Esta invitación fue anulada';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'Esta invitación ya fue usada';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'Esta invitación venció';
  end if;

  insert into group_members (group_id, user_id, role, added_by)
  values (v_invite.group_id, auth.uid(), 'admin', v_invite.invited_by)
  on conflict (group_id, user_id) do nothing;

  update group_invites
     set accepted_at = now(), accepted_by = auth.uid()
   where id = v_invite.id;

  return v_invite.group_id;
end;
$$;

revoke all on function public.accept_group_invite(uuid) from public;
grant execute on function public.accept_group_invite(uuid) to authenticated;

-- Ver a qué grupo te están invitando ANTES de aceptar, sin exponer nada más.
create or replace function public.peek_group_invite(p_token uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
           'group_name', g.name,
           'invited_by', coalesce(p.full_name, p.username),
           'valid', i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
         )
    from group_invites i
    join groups g on g.id = i.group_id
    left join profiles p on p.id = i.invited_by
   where i.token = p_token;
$$;

revoke all on function public.peek_group_invite(uuid) from public;
grant execute on function public.peek_group_invite(uuid) to anon, authenticated;

-- ---------------------------------------------------------------
-- 7. Crear un grupo (y quedar de owner) en una sola operación
-- ---------------------------------------------------------------
create or replace function public.create_group(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida';
  end if;
  if btrim(coalesce(p_name, '')) = '' then
    raise exception 'El grupo necesita un nombre';
  end if;

  insert into groups (name, created_by) values (btrim(p_name), auth.uid())
  returning id into v_id;

  insert into group_members (group_id, user_id, role, added_by)
  values (v_id, auth.uid(), 'owner', auth.uid());

  return v_id;
end;
$$;

revoke all on function public.create_group(text) from public;
grant execute on function public.create_group(text) to authenticated;
