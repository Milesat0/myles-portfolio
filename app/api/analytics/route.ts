import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import webpush from 'web-push';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

type VisitorProfile = {
  visitor_id: string;
  nickname: string | null;
  first_seen: string;
  last_seen: string;
  visit_count: number;
  pageview_count: number;
  interaction_count: number;
  latest_page: string;
  latest_event: string;
  device: string;
  browser: string;
  os: string;
  country: string;
  region: string;
  city: string;
  ip_encrypted: string | null;
  ip_masked: string | null;
};

function parseDevice(userAgent: string) {
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);

  const browser = /Edg\//i.test(userAgent)
    ? 'Edge'
    : /Chrome\//i.test(userAgent)
      ? 'Chrome'
      : /Firefox\//i.test(userAgent)
        ? 'Firefox'
        : /Safari\//i.test(userAgent)
          ? 'Safari'
          : 'Other';

  const os = /Windows/i.test(userAgent)
    ? 'Windows'
    : /Android/i.test(userAgent)
      ? 'Android'
      : /iPhone|iPad|iPod/i.test(userAgent)
        ? 'iOS'
        : /Mac OS/i.test(userAgent)
          ? 'macOS'
          : /Linux/i.test(userAgent)
            ? 'Linux'
            : 'Other';

  return {
    device: mobile ? 'Mobile' : 'Desktop',
    browser,
    os,
  };
}

function cleanReferrer(value: string | null) {
  if (!value) return 'Direct';

  try {
    return new URL(value)
      .hostname
      .replace(/^www\./, '')
      .slice(0, 160);
  } catch {
    return 'Other';
  }
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');

  return (
    forwarded?.split(',')[0]?.trim() ||
    real ||
    ''
  ).slice(0, 64);
}

function encryptIp(ip: string) {
  if (!ip || !process.env.ANALYTICS_IP_ENCRYPTION_KEY) {
    return null;
  }

  try {
    const key = Buffer.from(
      process.env.ANALYTICS_IP_ENCRYPTION_KEY,
      'base64',
    );

    if (key.length !== 32) {
      return null;
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      key,
      iv,
    );

    const ciphertext = Buffer.concat([
      cipher.update(ip, 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return `${iv.toString('base64url')}.${tag.toString(
      'base64url',
    )}.${ciphertext.toString('base64url')}`;
  } catch {
    return null;
  }
}

function isUuid(value: string | undefined | null): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function decodeLocation(
  value: string | null,
  fallback = '',
) {
  if (!value) return fallback;

  try {
    return decodeURIComponent(value).slice(0, 120);
  } catch {
    return value.slice(0, 120);
  }
}

function getPushDetails(event: string) {
  switch (event) {
    case 'contact_email':
      return {
        title: 'Myles Portfolio · Contact attempt',
        body: 'A visitor attempted to contact you by email.',
      };

    case 'contact_whatsapp':
      return {
        title: 'Myles Portfolio · Contact attempt',
        body: 'A visitor attempted to contact you on WhatsApp.',
      };

    case 'contact_call':
      return {
        title: 'Myles Portfolio · Contact attempt',
        body: 'A visitor attempted to contact you by phone.',
      };

    case 'cta_work_with_me':
      return {
        title: 'Myles Portfolio · Work interest',
        body: 'A visitor clicked your Work With Me CTA.',
      };

    case 'nav_contact':
      return {
        title: 'Myles Portfolio · Contact interest',
        body: 'A visitor reached your Contact section.',
      };

    case 'visitor_entry':
      return {
        title: 'Myles Portfolio · New visitor',
        body: 'Someone just entered your portfolio.',
      };

    default:
      return null;
  }
}

async function sendPushIfConfigured(payload: {
  title: string;
  body: string;
}) {
  const serverKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !process.env.VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.VAPID_SUBJECT ||
    !serverKey
  ) {
    return;
  }

  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serverKey,
      {
        auth: {
          persistSession: false,
        },
      },
    );

    const { data: subscriptions } = await admin
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth');

    for (const subscription of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload),
        );
      } catch (error: any) {
        if (
          error?.statusCode === 404 ||
          error?.statusCode === 410
        ) {
          await admin
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id);
        }
      }
    }
  } catch {
    // Analytics and push must never block the public site.
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const page =
      typeof body.page === 'string'
        ? body.page.slice(0, 200)
        : '/';

    const event =
      typeof body.event === 'string'
        ? body.event.slice(0, 80)
        : 'pageview';

    const userAgent =
      request.headers.get('user-agent') || '';

    const { device, browser, os } =
      parseDevice(userAgent);

    const country = decodeLocation(
      request.headers.get('x-vercel-ip-country') ||
        request.headers.get('cf-ipcountry'),
      'Unknown',
    ).slice(0, 80);

    const region = decodeLocation(
      request.headers.get(
        'x-vercel-ip-country-region',
      ),
    ).slice(0, 120);

    const city = decodeLocation(
      request.headers.get('x-vercel-ip-city'),
    ).slice(0, 120);

    /*
     * PHASE 3 IDENTITY MODEL
     *
     * visitor_id:
     *   Persistent anonymous browser identity.
     *
     * session_id:
     *   Individual visit. A new session begins after
     *   30 minutes of inactivity.
     *
     * No hardware fingerprinting is used.
     */

    const visitorCookie =
      request.cookies.get('myles_visitor_id')?.value || '';

    const sessionCookie =
      request.cookies.get('myles_session_id')?.value || '';

    let visitorId = isUuid(visitorCookie)
      ? visitorCookie
      : '';

    let sessionId = isUuid(sessionCookie)
      ? sessionCookie
      : crypto.randomUUID();

    const hasVisitorCookie = isUuid(visitorCookie);
    const hadValidSessionCookie = isUuid(sessionCookie);

    const nowDate = new Date();
    const now = nowDate.toISOString();

    const ip = getClientIp(request);
    const ipEncrypted = encryptIp(ip);

    const ipLastOctetMasked = ip
      ? ip.includes(':')
        ? `${ip.slice(
            0,
            Math.max(0, ip.length - 4),
          )}…`
        : ip.replace(
            /(\d+)(\.\d+)$/,
            'xxx$2',
          )
      : null;

    const serverKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serverKey) {
      console.error(
        '[analytics] Supabase server key is missing.',
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            process.env.NODE_ENV === 'development'
              ? 'Supabase server key is missing'
              : 'Analytics unavailable',
        },
        { status: 500 },
      );
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serverKey,
      {
        auth: {
          persistSession: false,
        },
      },
    );

    if (!visitorId) {
      const legacyVisitorCookie =
        request.cookies.get('myles_visitor')?.value || '';

      if (isUuid(legacyVisitorCookie)) {
        const { data: legacyVisitor } = await admin
          .from('visitor_profiles')
          .select('visitor_id')
          .eq('session_id', legacyVisitorCookie)
          .maybeSingle();

        if (legacyVisitor?.visitor_id) {
          visitorId = legacyVisitor.visitor_id;
        }
      }
    }

    if (!visitorId) {
      visitorId = crypto.randomUUID();
    }

    /*
     * ----------------------------------------------------------
     * 1. Resolve the persistent visitor
     * ----------------------------------------------------------
     */

    const {
      data: existingVisitorRaw,
      error: existingVisitorError,
    } = await admin
      .from('visitor_profiles')
      .select('*')
      .eq('visitor_id', visitorId)
      .maybeSingle();

    if (existingVisitorError) {
      console.error(
        '[analytics] visitor lookup failed:',
        existingVisitorError.message,
        existingVisitorError.code,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            process.env.NODE_ENV === 'development'
              ? existingVisitorError.message
              : 'Analytics unavailable',
        },
        { status: 500 },
      );
    }

    let visitorProfile =
      existingVisitorRaw as VisitorProfile | null;

    const visitorWasCreated = !visitorProfile;

    /*
     * ----------------------------------------------------------
     * 2. Resolve the current session
     * ----------------------------------------------------------
     */

    let sessionIsNew = !hadValidSessionCookie;
    let existingSessionLastSeen: string | null = null;

    if (hadValidSessionCookie) {
      const {
        data: existingSession,
        error: sessionLookupError,
      } = await admin
        .from('visitor_sessions')
        .select('session_id,visitor_id,last_seen')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (sessionLookupError) {
        console.error(
          '[analytics] session lookup failed:',
          sessionLookupError.message,
          sessionLookupError.code,
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              process.env.NODE_ENV === 'development'
                ? sessionLookupError.message
                : 'Analytics unavailable',
          },
          { status: 500 },
        );
      }

      if (
        !existingSession ||
        existingSession.visitor_id !== visitorId
      ) {
        sessionIsNew = true;
        sessionId = crypto.randomUUID();
      } else {
        existingSessionLastSeen =
          existingSession.last_seen;

        const lastSeenTime = Date.parse(
          existingSession.last_seen,
        );

        if (
          Number.isFinite(lastSeenTime) &&
          nowDate.getTime() - lastSeenTime >=
            SESSION_TIMEOUT_MS
        ) {
          sessionIsNew = true;
          sessionId = crypto.randomUUID();
        } else {
          sessionIsNew = false;
        }
      }
    }

    /*
     * ----------------------------------------------------------
     * 3. Create visitor profile when necessary
     * ----------------------------------------------------------
     *
     * visitor_profiles keeps lifetime identity and statistics.
     * nickname lives here, not on individual sessions.
     */

    if (!visitorProfile) {
      const {
        data: createdVisitor,
        error: createVisitorError,
      } = await admin
        .from('visitor_profiles')
        .insert({
          session_id: sessionId,
          visitor_id: visitorId,
          nickname: null,
          first_seen: now,
          last_seen: now,
          visit_count: 1,
          pageview_count:
            event === 'pageview' ? 1 : 0,
          interaction_count:
            event === 'pageview' ? 0 : 1,
          latest_page: page,
          latest_event: event,
          device,
          browser,
          os,
          country,
          region,
          city,
          ip_encrypted: ipEncrypted,
          ip_masked: ipLastOctetMasked,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();

      if (createVisitorError || !createdVisitor) {
        console.error(
          '[analytics] visitor profile creation failed:',
          createVisitorError?.message,
          createVisitorError?.code,
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              process.env.NODE_ENV === 'development'
                ? createVisitorError?.message ||
                  'Visitor profile creation failed'
                : 'Analytics unavailable',
          },
          { status: 500 },
        );
      }

      visitorProfile =
        createdVisitor as VisitorProfile;
    }

    /*
     * ----------------------------------------------------------
     * 4. Create the session when this is a new visit
     * ----------------------------------------------------------
     */

    if (sessionIsNew) {
      const { error: sessionInsertError } =
        await admin
          .from('visitor_sessions')
          .insert({
            session_id: sessionId,
            visitor_id: visitorId,
            started_at: now,
            last_seen: now,
            device,
            browser,
            os,
            country,
            region,
            city,
            ip_encrypted: ipEncrypted,
            ip_masked: ipLastOctetMasked,
            created_at: now,
            updated_at: now,
          });

      if (sessionInsertError) {
        /*
         * If another simultaneous request created the same
         * session, the duplicate is harmless. Anything else
         * should be surfaced.
         */
        if (sessionInsertError.code !== '23505') {
          console.error(
            '[analytics] session creation failed:',
            sessionInsertError.message,
            sessionInsertError.code,
            sessionInsertError.details,
          );

          return NextResponse.json(
            {
              ok: false,
              error:
                process.env.NODE_ENV === 'development'
                  ? sessionInsertError.message
                  : 'Analytics unavailable',
            },
            { status: 500 },
          );
        }
      }
    }

    /*
     * ----------------------------------------------------------
     * 5. Record the event
     * ----------------------------------------------------------
     */

    const { error: eventError } = await admin
      .from('analytics_events')
      .insert({
        session_id: sessionId,
        visitor_id: visitorId,
        page,
        event,
        referrer: cleanReferrer(
          request.headers.get('referer'),
        ),
        device,
        browser,
        os,
        country,
        region,
        city,
        ip_encrypted: ipEncrypted,
        ip_masked: ipLastOctetMasked,
      });

    if (eventError) {
      console.error(
        '[analytics] event insert failed:',
        eventError.message,
        eventError.details,
        eventError.hint,
        eventError.code,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            process.env.NODE_ENV === 'development'
              ? eventError.message
              : 'Analytics unavailable',
        },
        { status: 500 },
      );
    }

    /*
     * ----------------------------------------------------------
     * 6. Update lifetime visitor statistics
     * ----------------------------------------------------------
     */

    const isPageview = event === 'pageview';

    const nextVisitCount =
      (visitorProfile.visit_count || 0) +
      (visitorWasCreated || !sessionIsNew
        ? 0
        : 1);

    const nextPageviewCount =
      (visitorProfile.pageview_count || 0) +
      (isPageview ? 1 : 0);

    const nextInteractionCount =
      (visitorProfile.interaction_count || 0) +
      (isPageview ? 0 : 1);

    const { error: visitorUpdateError } =
      await admin
        .from('visitor_profiles')
        .update({
          /*
           * Never overwrite a manually assigned nickname.
           */
          nickname: visitorProfile.nickname ?? null,
          last_seen: now,
          visit_count: nextVisitCount,
          pageview_count: nextPageviewCount,
          interaction_count: nextInteractionCount,
          latest_page: page,
          latest_event: event,
          device,
          browser,
          os,
          country,
          region,
          city,
          ip_encrypted: ipEncrypted,
          ip_masked: ipLastOctetMasked,
          updated_at: now,
        })
        .eq('visitor_id', visitorId);

    if (visitorUpdateError) {
      console.error(
        '[analytics] visitor profile update failed:',
        visitorUpdateError.message,
        visitorUpdateError.code,
      );
    }

    /*
     * ----------------------------------------------------------
     * 7. Update the current session
     * ----------------------------------------------------------
     */

    const { error: sessionUpdateError } =
      await admin
        .from('visitor_sessions')
        .update({
          last_seen: now,
          device,
          browser,
          os,
          country,
          region,
          city,
          ip_encrypted: ipEncrypted,
          ip_masked: ipLastOctetMasked,
          updated_at: now,
        })
        .eq('session_id', sessionId)
        .eq('visitor_id', visitorId);

    if (sessionUpdateError) {
      console.error(
        '[analytics] session update failed:',
        sessionUpdateError.message,
        sessionUpdateError.code,
      );
    }

    /*
     * ----------------------------------------------------------
     * 8. Push notifications
     * ----------------------------------------------------------
     *
     * Phase 5 remains untouched.
     * Existing subscriptions still receive notifications.
     */

    const meaningfulEvents = new Set([
      'contact_email',
      'contact_whatsapp',
      'contact_call',
      'cta_work_with_me',
      'nav_contact',
    ]);

    const shouldNotify =
      visitorWasCreated ||
      meaningfulEvents.has(event);

    if (shouldNotify) {
      const pushDetails = visitorWasCreated
        ? getPushDetails('visitor_entry')
        : getPushDetails(event);

      if (pushDetails) {
        const location = [
          city,
          region,
          country,
        ]
          .filter(Boolean)
          .join(', ');

        await sendPushIfConfigured({
          title: pushDetails.title,
          body: location
            ? `${pushDetails.body} · ${location} · ${device}`
            : `${pushDetails.body} · ${device}`,
        });
      }
    }

    /*
     * ----------------------------------------------------------
     * 9. Persist identity/session cookies
     * ----------------------------------------------------------
     */

    const response = NextResponse.json({
      ok: true,
    });

    if (!hasVisitorCookie) {
      response.cookies.set(
        'myles_visitor_id',
        visitorId,
        {
          httpOnly: true,
          sameSite: 'lax',
          secure:
            process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 365 * 2,
          path: '/',
        },
      );
    }

    /*
     * Refresh the session cookie on every successful analytics request.
     * This keeps an actively used browser session alive while the
     * database timestamp remains the source of truth for the
     * 30-minute inactivity boundary.
     */
    response.cookies.set(
      'myles_session_id',
      sessionId,
      {
        httpOnly: true,
        sameSite: 'lax',
        secure:
          process.env.NODE_ENV === 'production',
        maxAge: 60 * 30,
        path: '/',
      },
    );

    /*
     * Remove the old session-style visitor cookie.
     */
    if (request.cookies.get('myles_visitor')) {
      response.cookies.set(
        'myles_visitor',
        '',
        {
          httpOnly: true,
          sameSite: 'lax',
          secure:
            process.env.NODE_ENV === 'production',
          maxAge: 0,
          path: '/',
        },
      );
    }

    return response;
  } catch (error) {
    console.error(
      '[analytics] unexpected error:',
      error,
    );

    return NextResponse.json(
      { ok: false },
      { status: 500 },
    );
  }
}
