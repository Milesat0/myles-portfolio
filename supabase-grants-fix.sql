-- Myles Portfolio: privilege fix for an existing Supabase project
-- Run this once in Supabase SQL Editor. RLS policies remain the row-level gate.

grant usage on schema public to anon, authenticated;

grant select on public.admin_users to authenticated;

grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;

grant insert on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
