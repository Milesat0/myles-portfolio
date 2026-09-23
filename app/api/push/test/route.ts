import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/supabase/server';

export async function POST() {
  const result = await requireAdmin();
  if (!result.user || !result.admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT || !serverKey) return NextResponse.json({ error: 'Push environment variables are not configured.' }, { status: 503 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serverKey!, { auth: { persistSession: false } });
  const { data: subscriptions } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('owner_id', String((result.user as { sub?: string }).sub || ''));
  if (!subscriptions?.length) return NextResponse.json({ error: 'No push subscription found. Enable push alerts first.' }, { status: 404 });
  let sent = 0;
  let failed = 0;
  let lastError = '';
  for (const subscription of subscriptions) {
    try { await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: 'Myles Portfolio · Test alert', body: 'Push notifications are working.' })); sent++; }
    catch (error: any) { failed++; lastError = error?.body || error?.message || `Push provider returned ${error?.statusCode || 'an error'}`; if (error?.statusCode === 404 || error?.statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', subscription.id); }
  }
  if (!sent) return NextResponse.json({ error: `Push delivery failed: ${lastError || 'unknown error'}` }, { status: 502 });
  return NextResponse.json({ ok: true, sent, failed });
}
