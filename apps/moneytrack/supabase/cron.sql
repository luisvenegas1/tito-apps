-- =====================================================================
-- Money Track — tareas programadas (correr UNA vez en el SQL Editor del
-- proyecto de producción, después de desplegar la Edge Function notify-due).
-- No es una migración: lleva la URL del proyecto y el CRON_SECRET.
-- Reemplazá <PROJECT_REF> y <CRON_SECRET>.
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Todos los días a las 7:00 a. m. de Costa Rica (13:00 UTC):
-- genera pagos recurrentes, crea avisos y envía push.
select cron.schedule(
  'moneytrack-notify-due',
  '0 13 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify-due',
    headers := '{"Authorization": "Bearer <CRON_SECRET>", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Para revisar ejecuciones:  select * from cron.job_run_details order by start_time desc limit 10;
-- Para quitarla:             select cron.unschedule('moneytrack-notify-due');
