import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { requireAdmin } from '@/lib/supabase/server';

function decryptIp(value: string) {
  const raw = process.env.ANALYTICS_IP_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) return null;
  const [ivRaw, tagRaw, ciphertextRaw] = value.split('.');
  if (!ivRaw || !tagRaw || !ciphertextRaw) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivRaw, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw, 'base64url')), decipher.final()]).toString('utf8');
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if (!result.user || !result.admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing event id.' }, { status: 400 });
  const { data, error } = await result.supabase.from('analytics_events').select('ip_encrypted').eq('id', id).maybeSingle();
  if (error || !data?.ip_encrypted) return NextResponse.json({ error: 'IP address is unavailable.' }, { status: 404 });
  const ip = decryptIp(data.ip_encrypted);
  if (!ip) return NextResponse.json({ error: 'IP decryption is not configured.' }, { status: 503 });
  return NextResponse.json({ ip });
}
