import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase/server';
import VisitorsManager from './ui';

export default async function VisitorsPage() {
  const result = await requireAdmin();
  if (!result.user) redirect('/login');
  if (!result.admin) redirect('/login?error=not-admin');
  return <VisitorsManager email={String(result.user.email ?? '')} />;
}
