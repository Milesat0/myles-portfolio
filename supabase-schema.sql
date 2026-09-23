-- Myles Portfolio CMS
-- Run this in Supabase SQL Editor after creating your project.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default '',
  "desc" text not null default '',
  tags text[] not null default '{}',
  accent text not null default 'violet' check (accent in ('violet','cyan','orange')),
  status text not null default 'In development',
  details text not null default '',
  images text[] not null default '{}',
  video text,
  icon text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.projects enable row level security;

-- Explicit table privileges. RLS decides which rows are allowed after these
-- grants; keeping both layers makes the schema work reliably on fresh and
-- existing Supabase projects.
grant usage on schema public to anon, authenticated;
grant select on public.admin_users to authenticated;
grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;

drop policy if exists "admins can read admin_users" on public.admin_users;
create policy "admins can read admin_users" on public.admin_users
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "public can read projects" on public.projects;
create policy "public can read projects" on public.projects
for select to anon, authenticated using (true);

drop policy if exists "admins can insert projects" on public.projects;
create policy "admins can insert projects" on public.projects
for insert to authenticated with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

drop policy if exists "admins can update projects" on public.projects;
create policy "admins can update projects" on public.projects
for update to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid()))) with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

drop policy if exists "admins can delete projects" on public.projects;
create policy "admins can delete projects" on public.projects
for delete to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

-- Give projects a stable unique title so the seed can be safely re-run.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'projects_title_key') then
    alter table public.projects add constraint projects_title_key unique (title);
  end if;
end $$;

-- Seed the current portfolio. Re-running is safe because titles are de-duplicated first.
insert into public.projects (title,type,"desc",tags,accent,status,details,images,video,icon,sort_order)
values
('NEXUS','Intelligent File Organization','A privacy-first desktop tool that scans, classifies and organizes files while keeping the user in control.',array['Python','AI','PySide6','Automation'],'violet','In development','A Windows-first file organization and cleanup app with scanning, classification, protected items, organization previews, local AI support and a privacy-first design.',array['/images/nexus-01.png'],null,'/images/icons/nexus.png',1),
('AudioBlitz','Media Processing','A media-focused application exploring audio processing, queue management, waveform visualization and mobile delivery.',array['Python','React Native','Expo','Audio'],'cyan','In development','An audio-focused project built around importing media, managing a queue, previewing audio, waveform visualization, merging, transitions and mobile delivery.',array['/images/audioblitz-01.png','/images/audioblitz-02.png','/images/audioblitz-03.png'],null,'/images/icons/audioblitz.png',2),
('VI Radar','GTA VI Intelligence Platform','A mobile-focused radar for GTA VI news, updates, sightings and everything worth tracking as the game gets closer.',array['React Native','Expo','Mobile','News'],'violet','In development','A mobile project designed to turn scattered GTA VI information into a focused radar experience. The project is evolving with more features, feeds and tools to come.',array['/images/vi-radar-cover.jpg'],'/images/vi-radar-demo.mp4','/images/icons/vi-radar.png',3),
('Paradise Eatery','Business Website','A modern web presence for a real food business, focused on clear navigation and practical customer actions.',array['Next.js','Supabase','UI/UX'],'orange','Client project','A customer-facing website built for a real food business, combining a polished interface with practical business information and Supabase-backed functionality.',array['/images/paradise-01.png','/images/paradise-02.png','/images/paradise-03.png','/images/paradise-04.png'],null,'/images/icons/paradise-eatery.png',4),
('SpaceSage','Productivity & Space Management','A focused productivity concept designed to turn planning, organization and personal workflows into a calmer digital space.',array['Next.js','Productivity','UI/UX'],'violet','In development','SpaceSage is a productivity-focused project exploring a calmer way to organize tasks, plans and personal workflows. The project is being shaped as a polished, practical experience rather than another noisy productivity dashboard.',array[]::text[],null,'/images/icons/spacesage.png',5),
('CareOS','Personal Care & Wellness Platform','A mobile-first care platform focused on making personal routines, tracking and everyday care easier to manage.',array['React Native','Mobile','Productivity','UX'],'cyan','In development','CareOS is a mobile-first project built around a practical personal-care experience, with the mobile version treated as the primary product. The project focuses on clear workflows, useful tracking and a calm interface that makes everyday care information easier to manage.',array[]::text[],null,'/images/icons/careos.png',6),
('Polo Court Hotel','Hospitality Website','A polished hotel website concept focused on presenting the property, amenities, story and guest-facing information with a calm luxury feel.',array['Web Development','UI/UX','Hospitality'],'cyan','Project','A hospitality-focused website for Polo Court Hotel in Port Harcourt, designed around a premium but approachable visual system. The project includes a home experience, amenities presentation, hotel story and a categorized gallery, with responsive navigation and guest-oriented calls to action.',array['/images/polo-court-01.png','/images/polo-court-02.png','/images/polo-court-03.png','/images/polo-court-04.png'],null,'',7)
on conflict (title) do update set updated_at=now();



-- First-party analytics. IP addresses are encrypted at rest and decrypted only for authenticated admins.
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  page text not null default '/',
  event text not null default 'pageview',
  referrer text not null default 'Direct',
  device text not null default 'Unknown',
  browser text not null default 'Other',
  country text not null default 'Unknown',
  os text not null default 'Other',
  region text not null default '',
  city text not null default '',
  ip_encrypted text,
  ip_masked text,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

grant insert on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;

drop policy if exists "public can record analytics" on public.analytics_events;
create policy "public can record analytics" on public.analytics_events
for insert to anon, authenticated with check (true);

drop policy if exists "admins can read analytics" on public.analytics_events;
create policy "admins can read analytics" on public.analytics_events
for select to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

create index if not exists analytics_events_created_at_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_session_id_idx on public.analytics_events(session_id);

-- Push subscriptions are private to the portfolio owner/admin.
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

grant select, insert, update, delete on public.push_subscriptions to authenticated;
drop policy if exists "admins can read push subscriptions" on public.push_subscriptions;
create policy "admins can read push subscriptions" on public.push_subscriptions
for select to authenticated using (owner_id = (select auth.uid()) and exists (select 1 from public.admin_users where user_id = (select auth.uid())));
drop policy if exists "admins can insert push subscriptions" on public.push_subscriptions;
create policy "admins can insert push subscriptions" on public.push_subscriptions
for insert to authenticated with check (owner_id = (select auth.uid()) and exists (select 1 from public.admin_users where user_id = (select auth.uid())));
drop policy if exists "admins can update push subscriptions" on public.push_subscriptions;
create policy "admins can update push subscriptions" on public.push_subscriptions
for update to authenticated using (owner_id = (select auth.uid()) and exists (select 1 from public.admin_users where user_id = (select auth.uid()))) with check (owner_id = (select auth.uid()) and exists (select 1 from public.admin_users where user_id = (select auth.uid())));
drop policy if exists "admins can delete push subscriptions" on public.push_subscriptions;
create policy "admins can delete push subscriptions" on public.push_subscriptions
for delete to authenticated using (owner_id = (select auth.uid()) and exists (select 1 from public.admin_users where user_id = (select auth.uid())));

-- Keep the ALTER statements for existing databases that were created with the earlier analytics schema.
alter table public.analytics_events add column if not exists os text not null default 'Other';
alter table public.analytics_events add column if not exists region text not null default '';
alter table public.analytics_events add column if not exists city text not null default '';
alter table public.analytics_events add column if not exists ip_encrypted text;
alter table public.analytics_events add column if not exists ip_masked text;

-- Optional retention helper: call periodically from a trusted scheduler if desired.
-- delete from public.analytics_events where created_at < now() - interval '90 days';


-- Push subscriptions are written by trusted server-side code using the Supabase
-- secret/service role. These grants are required even though that role bypasses RLS.
grant select, insert, update, delete on public.push_subscriptions to service_role;
do $$ begin
  if exists (select 1 from pg_class where relname = 'push_subscriptions_id_seq' and relkind = 'S') then
    grant usage, select on sequence public.push_subscriptions_id_seq to service_role;
  end if;
end $$;

-- Persistent visitor profiles. Analytics events remain the immutable activity log;
-- this table gives each returning visitor a stable admin-facing record and nickname.
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

drop policy if exists "admins can read visitor profiles" on public.visitor_profiles;
create policy "admins can read visitor profiles" on public.visitor_profiles
for select to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

drop policy if exists "admins can update visitor profiles" on public.visitor_profiles;
create policy "admins can update visitor profiles" on public.visitor_profiles
for update to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

grant select, insert, update on public.visitor_profiles to service_role;

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

