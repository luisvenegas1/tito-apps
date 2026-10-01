-- =====================================================================
-- Limpieza del esquema ANTERIOR (doc 06 original: receivable_accounts,
-- exchange_rates from/to) que existía vacío en el proyecto de producción
-- (0 filas, 0 usuarios, verificado el 2026-10-01 antes de aplicar).
-- Todo con IF EXISTS: en una base nueva no hace nada.
-- =====================================================================
drop trigger if exists on_auth_user_created on auth.users;

drop view if exists public.receivable_balances;

drop table if exists
  public.attachments,
  public.scheduled_payments,
  public.recurring_templates,
  public.transactions,
  public.receivable_accounts,
  public.goals,
  public.notifications,
  public.exchange_rates,
  public.categories,
  public.people,
  public.profiles
cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_updated_at() cascade;

drop type if exists
  public.currency_code,
  public.goal_type,
  public.paid_by,
  public.payment_status,
  public.recurrence_freq,
  public.txn_kind,
  public.txn_scope
cascade;
