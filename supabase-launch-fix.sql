-- Myles Portfolio launch fix
-- Run this in Supabase SQL Editor after the earlier portfolio migrations.
-- Allows authenticated admins to rename visitor records while keeping RLS locked to admin_users.

grant select, update on public.visitor_profiles to authenticated;

drop policy if exists "admins can update visitor profiles" on public.visitor_profiles;
create policy "admins can update visitor profiles" on public.visitor_profiles
for update to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
