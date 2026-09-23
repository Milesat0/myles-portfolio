import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const result = await requireAdmin();
  if (!result.user || !result.admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const subscription = body?.subscription;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid push subscription.' }, { status: 400 });
  }

  // requireAdmin() has already authenticated and authorized the current admin.
  // Use the server-only Supabase secret for this write so push registration does
  // not depend on the browser role's table grants/RLS path.
  const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serverKey) {
    return NextResponse.json({ error: 'Server push storage is not configured. Add SUPABASE_SECRET_KEY.' }, { status: 503 });
  }

  const ownerId = String((result.user as { sub?: string }).sub || '');
  if (!ownerId) return NextResponse.json({ error: 'Authenticated user ID is missing.' }, { status: 500 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serverKey, { auth: { persistSession: false } });
  const { error } = await admin.from('push_subscriptions').upsert({
    owner_id: ownerId,
    endpoint: String(subscription.endpoint),
    p256dh: String(subscription.keys.p256dh),
    auth: String(subscription.keys.auth),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });

  if (error) {
    console.error('[push] subscription save failed:', error.message, error.details, error.hint, error.code);
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Could not save push subscription.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
