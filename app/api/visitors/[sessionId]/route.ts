import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { requireAdmin } from '@/lib/supabase/server';

function decodeLocation(value: string | null) {
  if (!value) return value;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decryptIp(value: string | null) {
  const raw = process.env.ANALYTICS_IP_ENCRYPTION_KEY;
  if (!raw || !value) return null;

  const key = Buffer.from(raw, 'base64');

  if (key.length !== 32) return null;

  const [ivRaw, tagRaw, ciphertextRaw] = value.split('.');

  if (!ivRaw || !tagRaw || !ciphertextRaw) return null;

  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivRaw, 'base64url'),
    );

    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextRaw, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

function durationSeconds(startedAt: string, lastSeen: string) {
  const start = new Date(startedAt).getTime();
  const end = new Date(lastSeen).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 0;
  }

  return Math.max(0, Math.round((end - start) / 1000));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const result = await requireAdmin();

  if (!result.user || !result.admin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const { sessionId: visitorId } = await params;

  const { data: visitor, error: visitorError } = await result.supabase
    .from('visitor_profiles')
    .select(
      'visitor_id,session_id,nickname,first_seen,last_seen,visit_count,pageview_count,interaction_count,latest_page,latest_event,device,browser,os,country,region,city,ip_encrypted,ip_masked',
    )
    .eq('visitor_id', visitorId)
    .single();

  if (visitorError) {
    return NextResponse.json(
      { error: visitorError.message },
      { status: 404 },
    );
  }

  const { data: sessions, error: sessionsError } = await result.supabase
    .from('visitor_sessions')
    .select(
      'session_id,visitor_id,started_at,last_seen,device,browser,os,country,region,city,ip_encrypted,ip_masked,created_at,updated_at',
    )
    .eq('visitor_id', visitorId)
    .order('started_at', { ascending: false })
    .limit(500);

  if (sessionsError) {
    return NextResponse.json(
      { error: sessionsError.message },
      { status: 500 },
    );
  }

  const { data: events, error: eventsError } = await result.supabase
    .from('analytics_events')
    .select(
      'id,session_id,visitor_id,page,event,referrer,device,browser,os,country,region,city,ip_masked,created_at',
    )
    .eq('visitor_id', visitorId)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (eventsError) {
    return NextResponse.json(
      { error: eventsError.message },
      { status: 500 },
    );
  }

  const sessionEvents = new Map<string, typeof events>();

  for (const event of events ?? []) {
    if (!event.session_id) continue;

    const existing = sessionEvents.get(event.session_id) ?? [];
    existing.push(event);
    sessionEvents.set(event.session_id, existing);
  }

  const enrichedSessions = (sessions ?? []).map((session) => {
    const sessionRows = sessionEvents.get(session.session_id) ?? [];

    return {
      ...session,
      country: decodeLocation(session.country),
      region: decodeLocation(session.region),
      city: decodeLocation(session.city),
      ip_full: decryptIp(session.ip_encrypted),
      duration_seconds: durationSeconds(
        session.started_at,
        session.last_seen,
      ),
      event_count: sessionRows.length,
      events: sessionRows,
    };
  });

  return NextResponse.json({
    visitor: {
      ...visitor,
      country: decodeLocation(visitor.country),
      region: decodeLocation(visitor.region),
      city: decodeLocation(visitor.city),
      ip_full: decryptIp(visitor.ip_encrypted),
    },
    sessions: enrichedSessions,
    events: events ?? [],
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const result = await requireAdmin();

  if (!result.user || !result.admin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const { sessionId: visitorId } = await params;
  const body = await request.json().catch(() => ({}));

  const nickname =
    typeof body.nickname === 'string'
      ? body.nickname.trim().slice(0, 80)
      : '';

  const { data: existing, error: lookupError } =
    await result.supabase
      .from('visitor_profiles')
      .select('visitor_id')
      .eq('visitor_id', visitorId)
      .limit(1);

  if (lookupError) {
    return NextResponse.json(
      { error: lookupError.message },
      { status: 500 },
    );
  }

  if (!existing || existing.length === 0) {
    return NextResponse.json(
      { error: 'Visitor profile was not found.' },
      { status: 404 },
    );
  }

  const { error: updateError } = await result.supabase
    .from('visitor_profiles')
    .update({
      nickname: nickname || null,
      updated_at: new Date().toISOString(),
    })
    .eq('visitor_id', visitorId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 400 },
    );
  }

  const { data: updated, error: updatedLookupError } =
    await result.supabase
      .from('visitor_profiles')
      .select('visitor_id,nickname')
      .eq('visitor_id', visitorId)
      .limit(1);

  if (updatedLookupError) {
    return NextResponse.json(
      { error: updatedLookupError.message },
      { status: 500 },
    );
  }

  if (!updated || updated.length === 0) {
    return NextResponse.json(
      { error: 'Visitor was updated but could not be reloaded.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    visitor: updated[0],
  });
}
