import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase/server';
import AdminDashboard from './ui';

export default async function AdminPage() {
  const result = await requireAdmin();
  if (!result.user) redirect('/login');
  if (!result.admin) redirect('/login?error=not-admin');
  const { data: projects } = await result.supabase.from('projects').select('*').order('sort_order', { ascending: true });
  return <AdminDashboard initialProjects={projects ?? []} email={String(result.user.email ?? '')} />;
}
