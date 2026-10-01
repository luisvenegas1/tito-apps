-- =====================================================================
-- Money Track — tareas diarias (pg_cron + pg_net).
-- La URL del proyecto y el CRON_SECRET se leen del Vault (no viven en el
-- repo). Crear una vez por proyecto:
--   select vault.create_secret('https://<ref>.supabase.co', 'moneytrack_project_url');
--   select vault.create_secret('<CRON_SECRET>', 'moneytrack_cron_secret');
-- Si los secretos no existen (p. ej. en local), las tareas no hacen nada.
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.call_moneytrack_function(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url    text := (select decrypted_secret from vault.decrypted_secrets where name = 'moneytrack_project_url');
  v_secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'moneytrack_cron_secret');
begin
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url || '/functions/v1/' || p_name,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
end;
$$;
revoke all on function public.call_moneytrack_function(text) from public, anon, authenticated;

-- 6:00 a. m. de Costa Rica (12:00 UTC): tipo de cambio del BCCR para todos.
select cron.schedule('moneytrack-sync-rates', '0 12 * * *', $$select public.call_moneytrack_function('sync-rates')$$);
-- 7:00 a. m. de Costa Rica (13:00 UTC): pagos recurrentes, avisos y push.
select cron.schedule('moneytrack-notify-due', '0 13 * * *', $$select public.call_moneytrack_function('notify-due')$$);
