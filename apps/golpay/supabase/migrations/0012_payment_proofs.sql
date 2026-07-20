-- =====================================================================
-- Comprobantes de pago (Storage privado + ruta en match_players).
-- Subida vía Edge Function con signed upload URL (nunca escritura anónima
-- amplia). Lectura solo del organizador dueño, con URL temporal.
-- =====================================================================

alter table match_players add column if not exists payment_proof_path text;

-- Bucket PRIVADO (idempotente).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Lectura: solo el organizador dueño del partido al que pertenece el objeto.
-- Convención de ruta: "<match_id>/<random>.<ext>".
drop policy if exists "proofs_owner_read" on storage.objects;
create policy "proofs_owner_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and exists (
      select 1 from matches m
      where m.id::text = split_part(name, '/', 1) and m.owner_id = auth.uid()
    )
  );

-- Sin políticas de INSERT/UPDATE/DELETE para anon/authenticated:
-- la subida ocurre SOLO por signed upload URL emitida por la Edge Function
-- (service_role), tras validar token + PIN + partido + jugador.

-- Verifica el PIN de un partido (para la Edge Function de subida de comprobante).
-- Devuelve el match_id si el PIN es correcto; null si no. Solo la Edge Function
-- (service_role) la usa.
create or replace function verify_match_pin(p_token uuid, p_pin text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v matches;
begin
  select * into v from matches where public_token = p_token;
  if not found then return null; end if;
  if v.access_pin_hash is null or v.access_pin_hash <> crypt(p_pin, v.access_pin_hash) then
    return null;
  end if;
  return v.id;
end;
$$;
revoke all on function verify_match_pin(uuid, text) from public;
grant execute on function verify_match_pin(uuid, text) to service_role;

-- report_payment: ahora acepta la ruta del comprobante.
create or replace function report_payment(
  p_token uuid, p_pin text, p_match_player_id uuid,
  p_method text default null, p_note text default null,
  p_covered_ids uuid[] default '{}', p_proof_path text default null
)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_match matches; v_old payment_status; v_id uuid;
begin
  select * into v_match from matches where public_token = p_token;
  if not found then raise exception 'Partido no encontrado'; end if;
  if v_match.access_pin_hash is null
     or v_match.access_pin_hash <> crypt(p_pin, v_match.access_pin_hash) then
    raise exception 'PIN incorrecto';
  end if;
  if not exists (select 1 from match_players where id = p_match_player_id and match_id = v_match.id) then
    raise exception 'Jugador no pertenece al partido';
  end if;

  foreach v_id in array (array[p_match_player_id] || coalesce(p_covered_ids, '{}'))
  loop
    if not exists (select 1 from match_players where id = v_id and match_id = v_match.id) then continue; end if;
    select payment_status into v_old from match_players where id = v_id;
    if v_old = 'confirmado' then continue; end if;
    update match_players
      set payment_status = 'reportado', reported_at = now(),
          payment_method = coalesce(p_method, payment_method),
          note = coalesce(p_note, note),
          payment_proof_path = case when v_id = p_match_player_id then coalesce(p_proof_path, payment_proof_path) else payment_proof_path end,
          paid_by_player_id = case when v_id <> p_match_player_id then p_match_player_id else paid_by_player_id end
      where id = v_id;
    insert into payment_events (match_player_id, old_status, new_status, changed_by, amount)
    values (v_id, v_old, 'reportado', 'player', null);
  end loop;
  return json_build_object('ok', true);
end;
$$;

revoke all on function report_payment(uuid, text, uuid, text, text, uuid[], text) from public;
grant execute on function report_payment(uuid, text, uuid, text, text, uuid[], text) to anon, authenticated;
