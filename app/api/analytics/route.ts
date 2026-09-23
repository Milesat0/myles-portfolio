import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import webpush from 'web-push';

function parseDevice(userAgent: string) {
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  const browser = /Edg\//i.test(userAgent) ? 'Edge' : /Chrome\//i.test(userAgent) ? 'Chrome' : /Firefox\//i.test(userAgent) ? 'Firefox' : /Safari\//i.test(userAgent) ? 'Safari' : 'Other';
  const os = /Windows/i.test(userAgent) ? 'Windows' : /Android/i.test(userAgent) ? 'Android' : /iPhone|iPad|iPod/i.test(userAgent) ? 'iOS' : /Mac OS/i.test(userAgent) ? 'macOS' : /Linux/i.test(userAgent) ? 'Linux' : 'Other';
  return { device: mobile ? 'Mobile' : 'Desktop', browser, os };
}

function cleanReferrer(value: string | null) {
  if (!value) return 'Direct';
  try { return new URL(value).hostname.replace(/^www\./, '').slice(0, 160); } catch { return 'Other'; }
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  return (forwarded?.split(',')[0]?.trim() || real || '').slice(0, 64);
}

function encryptIp(ip: string) {
  if (!ip || !process.env.ANALYTICS_IP_ENCRYPTION_KEY) return null;
  const key = Buffer.from(process.env.ANALYTICS_IP_ENCRYPTION_KEY, 'base64');
  if (key.length !== 32) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(ip, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

async function sendPushIfConfigured(payload: { title: string; body: string; sessionId: string }) {
  const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT || !serverKey) return;
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serverKey!, { auth: { persistSession: false } });
    const { data: subscriptions } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth');
    for (const subscription of subscriptions ?? []) {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(payload));
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', subscription.id);
      }
    }
  } catch {
    // Analytics must never block the public site if push configuration is unavailable.
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const page = typeof body.page === 'string' ? body.page.slice(0, 200) : '/';
    const event = typeof body.event === 'string' ? body.event.slice(0, 80) : 'pageview';
    const userAgent = request.headers.get('user-agent') || '';
    const { device, browser, os } = parseDevice(userAgent);
    const country = (request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry') || 'Unknown').slice(0, 80);
    const region = (request.headers.get('x-vercel-ip-country-region') || '').slice(0, 120);
    const city = (request.headers.get('x-vercel-ip-city') || '').slice(0, 120);
    const existingSessionId = request.cookies.get('myles_visitor')?.value || '';
    const sessionId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existingSessionId) ? existingSessionId : crypto.randomUUID();
    const ip = getClientIp(request);
    const ipEncrypted = encryptIp(ip);
    const ipLastOctetMasked = ip ? (ip.includes(':') ? `${ip.slice(0, Math.max(0, ip.length - 4))}…` : ip.replace(/(\d+)(\.\d+)$/, 'xxx$2')) : null;
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    const referrer = cleanReferrer(request.headers.get('referer'));
    const { error } = await supabase.from('analytics_events').insert({ session_id: sessionId, page, event, referrer, device, browser, os, country, region, city, ip_encrypted: ipEncrypted, ip_masked: ipLastOctetMasked });
    if (error) {
      console.error('[analytics] Supabase insert failed:', error.message, error.details, error.hint, error.code);
      return NextResponse.json({ ok: false, error: process.env.NODE_ENV === 'development' ? error.message : 'Analytics unavailable' }, { status: 500 });
    }

    // Keep a persistent visitor profile alongside the raw event log. This is written
    // server-side so visitors cannot edit their own profile metadata.
    const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serverKey) {
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serverKey, { auth: { persistSession: false } });
      const { data: existing } = await admin.from('visitor_profiles').select('session_id,nickname,first_seen,visit_count,pageview_count,interaction_count').eq('session_id', sessionId).maybeSingle();
      const isPageview = event === 'pageview';
      const next = {
        session_id: sessionId,
        first_seen: existing?.first_seen || new Date().toISOString(),
        last_seen: new Date().toISOString(),
        visit_count: (existing?.visit_count || 0) + (existing ? 0 : 1),
        pageview_count: (existing?.pageview_count || 0) + (isPageview ? 1 : 0),
        interaction_count: (existing?.interaction_count || 0) + (isPageview ? 0 : 1),
        latest_page: page, latest_event: event, device, browser, os, country, region, city,
        ip_encrypted: ipEncrypted, ip_masked: ipLastOctetMasked, updated_at: new Date().toISOString(),
      };
      // A returning session is kept as one visitor record. A nickname is never overwritten.
      const { error: profileError } = await admin.from('visitor_profiles').upsert({ ...next, nickname: existing?.nickname ?? null }, { onConflict: 'session_id' });
      if (profileError) console.error('[analytics] visitor profile update failed:', profileError.message, profileError.code);
    }

    // Only meaningful, high-intent signals trigger a push. Ordinary pageviews stay quiet.
    if (event !== 'pageview' && (event === 'contact_email' || event === 'contact_whatsapp' || event === 'contact_call' || event === 'cta_work_with_me' || event === 'nav_contact')) {
      const location = [city, region, country].filter(Boolean).join(', ');
      await sendPushIfConfigured({
        title: 'Myles Portfolio · High-intent activity',
        body: `${location || country} · ${device} · ${event.replaceAll('_', ' ')}`,
        sessionId,
      });
    }

    const response = NextResponse.json({ ok: true });
    if (!request.cookies.get('myles_visitor')) response.cookies.set('myles_visitor', sessionId, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 30, path: '/' });
    return response;
  } catch { return NextResponse.json({ ok: false }, { status: 500 }); }
}
