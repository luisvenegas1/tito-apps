-- =====================================================================
--  RLS por membresía de grupo.
--
--  Reemplaza las 11 políticas de "sos el dueño" por "sos miembro del grupo".
--  Corré esto INMEDIATAMENTE después de 0020: entre una y otra, la app ve
--  sus datos con las reglas viejas (que siguen funcionando porque owner_id
--  no se borró), pero los grupos todavía no dan acceso a nadie más.
--
--  Lo público (enlace del partido) no pasa por acá: sigue entrando por
--  get_public_match y las RPC con token, que son security definer.
-- =====================================================================

alter table groups         enable row level security;
alter table group_members  enable row level security;
alter table group_invites  enable row level security;

-- ---------------------------------------------------------------
-- groups
-- ---------------------------------------------------------------
drop policy if exists "groups_member_read"   on groups;
drop policy if exists "groups_owner_write"   on groups;
drop policy if exists "groups_insert_self"   on groups;

create policy "groups_member_read" on groups
  for select using (is_group_member(id));

-- Renombrar / eliminar: solo el owner.
create policy "groups_owner_write" on groups
  for update using (is_group_owner(id)) with check (is_group_owner(id));

create policy "groups_owner_delete" on groups
  for delete using (is_group_owner(id));

-- Se crean vía create_group(), pero permitimos el insert directo del propio
-- usuario para no dejar la tabla sin ruta de escritura.
create policy "groups_insert_self" on groups
  for insert with check (created_by = auth.uid());

-- ---------------------------------------------------------------
-- group_members
-- ---------------------------------------------------------------
drop policy if exists "gm_read"         on group_members;
drop policy if exists "gm_owner_write"  on group_members;
drop policy if exists "gm_leave"        on group_members;

-- Ver quiénes están en los grupos donde estoy.
create policy "gm_read" on group_members
  for select using (is_group_member(group_id));

-- Agregar y cambiar rol: solo el owner. (Entrar por invitación pasa por
-- accept_group_invite, que es security definer y no depende de esta política.)
create policy "gm_owner_insert" on group_members
  for insert with check (is_group_owner(group_id));

create policy "gm_owner_update" on group_members
  for update using (is_group_owner(group_id)) with check (is_group_owner(group_id));

-- El owner puede sacar a cualquiera; cualquiera puede salirse solo.
create policy "gm_delete" on group_members
  for delete using (is_group_owner(group_id) or user_id = auth.uid());

-- ---------------------------------------------------------------
-- group_invites
-- ---------------------------------------------------------------
drop policy if exists "gi_member_all" on group_invites;

-- Cualquier miembro puede invitar, ver y anular invitaciones de su grupo.
-- Aceptarlas NO pasa por acá (el invitado todavía no es miembro): va por
-- accept_group_invite / peek_group_invite.
create policy "gi_member_all" on group_invites
  for all using (is_group_member(group_id)) with check (is_group_member(group_id));

-- ---------------------------------------------------------------
-- Tablas existentes: de owner_id a membresía
-- ---------------------------------------------------------------
drop policy if exists "freq_owner"    on frequent_players;
drop policy if exists "matches_owner" on matches;
drop policy if exists "mp_owner"      on match_players;
drop policy if exists "teams_owner"   on teams;
drop policy if exists "tm_owner"      on team_members;
drop policy if exists "pe_owner"      on payment_events;
drop policy if exists "results_owner" on match_results;
drop policy if exists "match_games_owner" on match_games;

create policy "freq_group" on frequent_players
  for all using (is_group_member(group_id)) with check (is_group_member(group_id));

create policy "matches_group" on matches
  for all using (is_group_member(group_id)) with check (is_group_member(group_id));

create policy "mp_group" on match_players
  for all using (
    exists (select 1 from matches m where m.id = match_id and is_group_member(m.group_id))
  ) with check (
    exists (select 1 from matches m where m.id = match_id and is_group_member(m.group_id))
  );

create policy "teams_group" on teams
  for all using (
    exists (select 1 from matches m where m.id = match_id and is_group_member(m.group_id))
  ) with check (
    exists (select 1 from matches m where m.id = match_id and is_group_member(m.group_id))
  );

create policy "tm_group" on team_members
  for all using (
    exists (
      select 1 from teams t join matches m on m.id = t.match_id
      where t.id = team_id and is_group_member(m.group_id)
    )
  ) with check (
    exists (
      select 1 from teams t join matches m on m.id = t.match_id
      where t.id = team_id and is_group_member(m.group_id)
    )
  );

create policy "pe_group" on payment_events
  for select using (
    exists (
      select 1 from match_players mp join matches m on m.id = mp.match_id
      where mp.id = match_player_id and is_group_member(m.group_id)
    )
  );

create policy "results_group" on match_results
  for all using (
    exists (select 1 from matches m where m.id = match_id and is_group_member(m.group_id))
  ) with check (
    exists (select 1 from matches m where m.id = match_id and is_group_member(m.group_id))
  );

create policy "match_games_group" on match_games
  for all using (
    exists (select 1 from matches m where m.id = match_id and is_group_member(m.group_id))
  ) with check (
    exists (select 1 from matches m where m.id = match_id and is_group_member(m.group_id))
  );

-- ---------------------------------------------------------------
-- Comprobantes en Storage: la ruta es "<match_id>/<uuid>.<ext>"
-- ---------------------------------------------------------------
drop policy if exists "proofs_owner_read" on storage.objects;

create policy "proofs_group_read" on storage.objects
  for select using (
    bucket_id = 'payment-proofs'
    and exists (
      select 1 from matches m
       where m.id::text = split_part(name, '/', 1)
         and is_group_member(m.group_id)
    )
  );

-- ---------------------------------------------------------------
-- Verificación: contá que todo tenga grupo. Las tres deben dar 0.
-- ---------------------------------------------------------------
select
  (select count(*) from matches          where group_id is null) as partidos_sin_grupo,
  (select count(*) from frequent_players where group_id is null) as jugadores_sin_grupo,
  (select count(*) from groups g
     where not exists (select 1 from group_members gm where gm.group_id = g.id)) as grupos_sin_miembros;
