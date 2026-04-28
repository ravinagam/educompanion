import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

const ADMIN_EMAIL = 'ravi.nagam.kiran@gmail.com';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect('/dashboard');

  const admin = createAdminClient();

  const [usersRes, feedbackRes] = await Promise.all([
    admin
      .from('users')
      .select('id, name, email, grade, board, created_at, subjects(id, name, chapters(id, name, upload_status))')
      .order('created_at', { ascending: false }),
    admin
      .from('feedback')
      .select('id, message, page, created_at, user:users(name, email)')
      .order('created_at', { ascending: false }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <AdminDashboard users={(usersRes.data ?? []) as any} feedback={(feedbackRes.data ?? []) as any} />;
}
