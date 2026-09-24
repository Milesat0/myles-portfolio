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
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivRaw, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw, 'base64url')), decipher.final()]).toString('utf8');
  } catch { return null; }
}

export async function GET() {
  const result = await requireAdmin();
  if (!result.user || !result.admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await result.supabase.from('analytics_events').select('id,session_id,visitor_id,page,event,referrer,device,browser,os,country,region,city,ip_encrypted,ip_masked,created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []).map(row => ({ ...row, country: decodeLocation(row.country), region: decodeLocation(row.region), city: decodeLocation(row.city), ip_full: decryptIp(row.ip_encrypted) }));
  return NextResponse.json(rows);
}
