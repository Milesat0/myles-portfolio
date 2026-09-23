import { createClient } from '@supabase/supabase-js';
import { defaultProjects } from '@/lib/projects';

export async function getPublicProjects() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return defaultProjects;
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession:false } });
    const { data, error } = await supabase.from('projects').select('*').order('sort_order', { ascending:true });
    return !error && data?.length ? data : defaultProjects;
  } catch { return defaultProjects; }
}
