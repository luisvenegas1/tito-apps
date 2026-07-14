-- =====================================================================
-- "Mis jugadores": notas y desactivación (soft delete) en frequent_players.
-- =====================================================================

alter table frequent_players
  add column if not exists notes text;

alter table frequent_players
  add column if not exists is_active boolean not null default true;

-- Índice para listar/ordenar los jugadores activos del organizador.
create index if not exists frequent_players_owner_active_idx
  on frequent_players (owner_id, is_active);
