import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase/server';
import ProjectsManager from './ui';

export default async function ProjectsPage() {
  const result = await requireAdmin();
  if (!result.user) redirect('/login');
  if (!result.admin) redirect('/login?error=not-admin');
  const { data: projects } = await result.supabase.from('projects').select('*').order('sort_order', { ascending: true });
  return <ProjectsManager initialProjects={projects ?? []} email={String(result.user.email ?? '')} />;
}
