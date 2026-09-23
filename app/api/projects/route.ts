import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const { supabase, user, admin } = await requireAdmin();
  if (!user || !admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const { data, error } = await supabase.from('projects').insert({ ...body, video: body.video || null }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ project: data });
}
