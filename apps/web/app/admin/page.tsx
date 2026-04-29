import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

const ADMIN_EMAIL = 'ravi.nagam.kiran@gmail.com';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in, or logged in as a student → admin login page
  if (!user || user.email !== ADMIN_EMAIL) redirect('/admin/login');

  const admin = createAdminClient();

  const [usersRes, feedbackRes, usageRes] = await Promise.all([
    admin
      .from('users')
      .select('id, name, email, grade, board, created_at, contact_email, phone_number, subjects(id, name, chapters(id, name, upload_status))')
      .order('created_at', { ascending: false }),
    admin
      .from('feedback')
      .select('id, message, page, created_at, admin_response, admin_responded_at, status, user:users(name, email)')
      .order('created_at', { ascending: false }),
    admin
      .from('ai_usage_logs')
      .select('user_id, feature, input_tokens, output_tokens, cost_usd, created_at')
      .order('created_at', { ascending: false }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <AdminDashboard users={(usersRes.data ?? []) as any} feedback={(feedbackRes.data ?? []) as any} usageLogs={(usageRes.data ?? []) as any} />;
}
