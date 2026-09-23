# Myles Portfolio + Admin CMS

Modern dark portfolio built with Next.js + React + TypeScript, now with a real Supabase-backed admin CMS.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Admin CMS

The private dashboard lives at:

`/admin`

It supports:

- Secure email/password sign-in through Supabase Auth
- Server-side admin authorization
- Create, edit and delete portfolio projects
- Reorder projects
- Edit titles, descriptions, tags, status and project details
- Edit icon, screenshots and demo-video paths
- Public portfolio reads CMS data automatically
- Built-in static project fallback when Supabase is not configured
- Row Level Security policies for the project database

The login page intentionally has no public sign-up button. Create the owner account directly in Supabase Auth, then add its Auth UUID to `public.admin_users`. This means a visitor cannot create an admin account from the portfolio.

## Supabase setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run the complete contents of `supabase-schema.sql`.
4. In Supabase Authentication, create the single owner/admin user you want to use for the portfolio.
5. Copy that user's Auth UUID.
6. Run:

```sql
insert into public.admin_users (user_id)
values ('YOUR-AUTH-USER-UUID');
```

7. Copy `.env.example` to `.env.local`.
8. Fill in:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

9. Restart the dev server.
10. Visit `/login` and sign in.

Supabase's current Next.js guidance uses `@supabase/ssr` for cookie-based server-side sessions and recommends protecting data with Row Level Security. The project follows that architecture.

## Important production note

Do not commit `.env.local` or any secret key. Only the publishable Supabase key belongs in the browser-facing environment. Keep any future service-role key server-only.

The included public portfolio API intentionally uses the publishable key and relies on the database's RLS policies for public reads. Admin writes are checked server-side and again enforced by RLS.

## Current project assets

The portfolio already includes the existing project screenshots, VI Radar demo, project icons, favicon and Open Graph image.

## Admin projects page

`/admin/projects` is a dedicated project-management screen. The main `/admin` dashboard remains the control room for analytics and push alerts, while `/admin/projects` provides the full project editor. Both routes require the Supabase Auth user to also exist in `public.admin_users`.

## Before deployment

- Set `NEXT_PUBLIC_SITE_URL` to the real production URL.
- Add the production URL to Supabase Auth's allowed redirect/site URL settings.
- Verify the admin user exists in `public.admin_users`.
- Test `/login`, `/admin`, create/edit/delete, sign-out and the public portfolio.
- Confirm RLS policies are enabled.
- Keep `.env.local` out of Git.


## Visitor analytics

The portfolio includes a first-party, privacy-conscious analytics layer backed by Supabase. It records a random visitor session ID, page/event, referrer hostname, device type, browser, country (when the hosting platform provides a coarse country header), and timestamp. It stores the visitor IP only in encrypted form for authenticated admin use. The dashboard shows a masked IP by default, with full-IP reveal protected behind admin authentication. The system does not attempt to identify a visitor by name, address, or other personal identity data.

The `/admin` dashboard shows recent activity, visitors today, pageviews, interactions, and visitors currently active within the last five minutes. It also shows coarse country/region/city, device, operating system, browser, referral source and a masked IP address. The full IP is encrypted at rest and can only be revealed by the authenticated admin through the private IP endpoint. Consider setting a retention period appropriate to your privacy obligations instead of keeping visitor records indefinitely.

### Push alerts

The admin can enable browser push notifications from `/admin`. Push alerts are intentionally reserved for high-intent events such as contact clicks and the main work-with-me CTA, so normal browsing does not spam the owner. Push notifications can arrive even when the admin dashboard is closed, provided the browser/OS permits web push.

To enable push in production, generate a VAPID key pair and set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and the server-only `SUPABASE_SERVICE_ROLE_KEY`. Also set `ANALYTICS_IP_ENCRYPTION_KEY` to a base64-encoded 32-byte secret. Never expose the private VAPID key, Supabase service-role key, or encryption key to the browser.

After running the complete `supabase-schema.sql`, analytics and push-subscription storage are ready. The public site continues to work if analytics or push configuration is unavailable.

## Admin setup

1. Create each admin account in Supabase Authentication → Users.
2. Add each Auth user's UUID to `public.admin_users`.
3. Put the Supabase project URL and publishable key in `.env.local`.
4. Keep `SUPABASE_SECRET_KEY` (or the legacy `SUPABASE_SERVICE_ROLE_KEY`), VAPID private key, and `ANALYTICS_IP_ENCRYPTION_KEY` server-side only.

The admin dashboard displays the full visitor IP to authenticated admins while the database stores the IP encrypted at rest. If you collect IP addresses in production, publish a clear privacy notice and set a sensible retention period.
## Final publish checklist

Before production: set `NEXT_PUBLIC_SITE_URL` to the real HTTPS domain; configure the Supabase URL/publishable key; configure `SUPABASE_SECRET_KEY`; configure the VAPID public/private key and subject; set `ANALYTICS_IP_ENCRYPTION_KEY`; run `supabase-schema.sql` (or the latest migration files) in Supabase; run the portfolio storage migration so `portfolio-assets` exists; sign in at `/admin`; enable push alerts and send a test push; upload a test project asset from `/admin/projects`; verify the public portfolio loads that asset; and run `npm run build` before deployment.


## Launch fix: visitor nicknames

If visitor renaming returns `permission denied for table visitor_profiles`, run `supabase-launch-fix.sql` in the Supabase SQL Editor. It grants authenticated admins the required UPDATE privilege and adds the matching admin-only RLS policy.

### Windows local development performance

If Next.js reports `Slow filesystem detected`, this is a local development filesystem benchmark warning, not an application error. For faster Turbopack development on Windows, keep the project in a normal local path such as `C:\Dev\miles-portfolio` rather than a synced/network-backed folder. Do not disable security software just to hide the warning.
