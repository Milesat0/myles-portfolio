-- Run this once in Supabase SQL Editor.
-- Fixes push subscription permissions and creates persistent visitor profiles.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.push_subscriptions to service_role;
do $$ begin
  if exists (select 1 from pg_class where relname = 'push_subscriptions_id_seq' and relkind = 'S') then
    grant usage, select on sequence public.push_subscriptions_id_seq to service_role;
  end if;
end $$;

create table if not exists public.visitor_profiles (
  session_id uuid primary key,
  nickname text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  visit_count integer not null default 1,
  pageview_count integer not null default 0,
  interaction_count integer not null default 0,
  latest_page text not null default '/',
  latest_event text not null default 'pageview',
  device text not null default 'Unknown',
  browser text not null default 'Other',
  os text not null default 'Other',
  country text not null default 'Unknown',
  region text not null default '',
  city text not null default '',
  ip_encrypted text,
  ip_masked text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.visitor_profiles enable row level security;
grant select, update on public.visitor_profiles to authenticated;
grant select, insert, update on public.visitor_profiles to service_role;
drop policy if exists "admins can read visitor profiles" on public.visitor_profiles;
create policy "admins can read visitor profiles" on public.visitor_profiles
for select to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
drop policy if exists "admins can update visitor profiles" on public.visitor_profiles;
create policy "admins can update visitor profiles" on public.visitor_profiles
for update to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

-- Portfolio media storage. The bucket is public for serving portfolio assets;
-- only authenticated admins can upload, replace, or delete files.
insert into storage.buckets (id, name, public)
values ('portfolio-assets', 'portfolio-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "admins can upload portfolio assets" on storage.objects;
create policy "admins can upload portfolio assets" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'portfolio-assets'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);

drop policy if exists "admins can update portfolio assets" on storage.objects;
create policy "admins can update portfolio assets" on storage.objects
for update to authenticated
using (
  bucket_id = 'portfolio-assets'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
)
with check (
  bucket_id = 'portfolio-assets'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);

drop policy if exists "admins can delete portfolio assets" on storage.objects;
create policy "admins can delete portfolio assets" on storage.objects
for delete to authenticated
using (
  bucket_id = 'portfolio-assets'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);

