-- =====================================================================
-- Money Track — permisos explícitos. Las versiones recientes de Supabase
-- ya no otorgan DML por defecto: 'authenticated' recibe solo lo necesario
-- (RLS sigue decidiendo qué filas); 'anon' no recibe acceso a tablas.
-- =====================================================================
grant usage on schema public to authenticated, anon;

grant select, insert, update, delete on
  public.people, public.categories, public.exchange_rates,
  public.transactions, public.recurring_templates, public.scheduled_payments,
  public.attachments, public.goals, public.notifications, public.push_subscriptions
to authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.shared_accounts to authenticated;
grant select, delete on public.shared_account_invites to authenticated;
grant select, insert, update on public.shared_entries to authenticated;
grant select on public.shared_entry_history to authenticated;
grant select on public.shared_balances to authenticated;

-- Funciones internas que no deben llamarse desde el cliente
revoke all on function public.build_due_notifications() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
