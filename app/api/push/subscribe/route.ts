import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/supabase/server';

function getOwnerId(result: Awaited<ReturnType<typeof requireAdmin>>) {
  return String((result.user as { sub?: string }).sub || '');
}

function getServerClient() {
  const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serverKey) return null;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serverKey,
    { auth: { persistSession: false } }
  );
}

function getEndpoint(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get('endpoint')?.trim() || '';
}

export async function GET(request: Request) {
  const result = await requireAdmin();

  if (!result.user || !result.admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const endpoint = getEndpoint(request);

  if (!endpoint) {
    return NextResponse.json({ error: 'Push endpoint is required.' }, { status: 400 });
  }

  const admin = getServerClient();

  if (!admin) {
    return NextResponse.json(
      { error: 'Server push storage is not configured.' },
      { status: 503 }
    );
  }

  const ownerId = getOwnerId(result);

  if (!ownerId) {
    return NextResponse.json(
      { error: 'Authenticated user ID is missing.' },
      { status: 500 }
    );
  }

  const { data, error } = await admin
    .from('push_subscriptions')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('endpoint', endpoint)
    .maybeSingle();

  if (error) {
    console.error('[push] subscription check failed:', error.message);
    return NextResponse.json(
      { error: 'Could not check push subscription.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ active: Boolean(data) });
}

export async function POST(request: Request) {
  const result = await requireAdmin();

  if (!result.user || !result.admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const subscription = body?.subscription;

  if (
    !subscription?.endpoint ||
    !subscription?.keys?.p256dh ||
    !subscription?.keys?.auth
  ) {
    return NextResponse.json(
      { error: 'Invalid push subscription.' },
      { status: 400 }
    );
  }

  const admin = getServerClient();

  if (!admin) {
    return NextResponse.json(
      { error: 'Server push storage is not configured. Add SUPABASE_SECRET_KEY.' },
      { status: 503 }
    );
  }

  const ownerId = getOwnerId(result);

  if (!ownerId) {
    return NextResponse.json(
      { error: 'Authenticated user ID is missing.' },
      { status: 500 }
    );
  }

  const { error } = await admin
    .from('push_subscriptions')
    .upsert(
      {
        owner_id: ownerId,
        endpoint: String(subscription.endpoint),
        p256dh: String(subscription.keys.p256dh),
        auth: String(subscription.keys.auth),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

  if (error) {
    console.error(
      '[push] subscription save failed:',
      error.message,
      error.details,
      error.hint,
      error.code
    );

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Could not save push subscription.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const result = await requireAdmin();

  if (!result.user || !result.admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const endpoint = String(body?.endpoint || '').trim();

  if (!endpoint) {
    return NextResponse.json(
      { error: 'Push endpoint is required.' },
      { status: 400 }
    );
  }

  const admin = getServerClient();

  if (!admin) {
    return NextResponse.json(
      { error: 'Server push storage is not configured.' },
      { status: 503 }
    );
  }

  const ownerId = getOwnerId(result);

  if (!ownerId) {
    return NextResponse.json(
      { error: 'Authenticated user ID is missing.' },
      { status: 500 }
    );
  }

  const { error } = await admin
    .from('push_subscriptions')
    .delete()
    .eq('owner_id', ownerId)
    .eq('endpoint', endpoint);

  if (error) {
    console.error(
      '[push] subscription delete failed:',
      error.message,
      error.details,
      error.hint,
      error.code
    );

    return NextResponse.json(
      { error: 'Could not remove push subscription.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
