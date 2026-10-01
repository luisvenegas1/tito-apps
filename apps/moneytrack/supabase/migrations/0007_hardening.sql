-- =====================================================================
-- Endurecimiento según `supabase db advisors` (2026-10-01).
-- =====================================================================

-- search_path fijo en todas las funciones (evita que un esquema ajeno las secuestre).
alter function public.occurrence_date(public.recurrence_freq, date, int, int) set search_path = public;
alter function public.generate_scheduled_payments(date) set search_path = public;
alter function public.add_charge_to_expenses(uuid, uuid) set search_path = public;
alter function public.shared_accounts_guard() set search_path = public;
alter function public.shared_entries_before_insert() set search_path = public;
alter function public.touch_updated_at() set search_path = public;
alter function public.charge_and_expense(uuid, numeric, public.currency_code, date, text, uuid, text, uuid, public.txn_kind) set search_path = public;
alter function public.pay_scheduled_payment(uuid, numeric, date) set search_path = public;

-- Funciones de trigger: nadie las llama directamente (los triggers no requieren EXECUTE al dispararse).
revoke all on function public.shared_entries_before_update() from public, anon, authenticated;
revoke all on function public.transactions_fx() from public, anon, authenticated;
revoke all on function public.shared_entries_before_insert() from public, anon, authenticated;
revoke all on function public.shared_accounts_guard() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

-- is_shared_member la usan las políticas RLS de usuarios con sesión; los anónimos no.
revoke all on function public.is_shared_member(uuid) from public, anon;
grant execute on function public.is_shared_member(uuid) to authenticated;

-- invite_preview: pública a propósito (la página de invitación se ve sin sesión) y
-- solo devuelve nombres y el correo invitado, nunca montos.
-- accept_invite / create_invite: solo usuarios con sesión (ya otorgado en 0002).

-- pg_net fuera del esquema public (sus funciones viven en el esquema "net").
drop extension if exists pg_net;
create extension pg_net with schema extensions;
