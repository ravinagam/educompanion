import { redirect } from 'next/navigation';
import { createAdminSessionClient } from '@/lib/supabase/admin-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

const ADMIN_EMAIL = 'ravi.nagam.kiran@gmail.com';

export default async function AdminPage() {
  const supabase = await createAdminSessionClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in, or logged in as a student → admin login page
  if (!user || user.email !== ADMIN_EMAIL) redirect('/admin/login');

  const admin = createAdminClient();

  const [usersRes, feedbackRes, usageRes, referralsRes, clicksRes] = await Promise.all([
    admin
      .from('users')
      .select('id, name, email, grade, board, created_at, contact_email, phone_number, referral_code, referred_by, subjects(id, name, chapters(id, name, upload_status))')
      .order('created_at', { ascending: false }),
    admin
      .from('feedback')
      .select('id, message, page, created_at, admin_response, admin_responded_at, status, rating, category, user:users(name, email)')
      .order('created_at', { ascending: false }),
    admin
      .from('ai_usage_logs')
      .select('user_id, feature, input_tokens, output_tokens, cost_usd, created_at')
      .order('created_at', { ascending: false }),
    admin
      .from('referrals')
      .select('id, referrer_id, referred_id, rewarded_at, created_at')
      .order('created_at', { ascending: false }),
    admin
      .from('referral_clicks')
      .select('referral_code, clicked_at'),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <AdminDashboard users={(usersRes.data ?? []) as any} feedback={(feedbackRes.data ?? []) as any} usageLogs={(usageRes.data ?? []) as any} referrals={(referralsRes.data ?? []) as any} referralClicks={(clicksRes.data ?? []) as any} />;
}
