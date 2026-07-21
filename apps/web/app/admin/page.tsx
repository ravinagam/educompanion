import { redirect } from 'next/navigation';
import { createAdminSessionClient } from '@/lib/supabase/admin-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatParentPhone, normalizePhone } from '@/lib/parent-auth';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

const ADMIN_EMAIL = 'ravi.nagam.kiran@gmail.com';

export default async function AdminPage() {
  const supabase = await createAdminSessionClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in, or logged in as a student → admin login page
  if (!user || user.email !== ADMIN_EMAIL) redirect('/admin/login');

  const admin = createAdminClient();

  const [usersRes, feedbackRes, usageRes, referralsRes, clicksRes, gamificationRes, milestonesRes] = await Promise.all([
    admin
      .from('users')
      .select('id, name, email, grade, board, created_at, contact_email, phone_number, referral_code, referred_by, subjects(id, name, chapters(id, name, upload_status))')
      .order('created_at', { ascending: false }),
    admin
      .from('feedback')
      .select('id, user_id, message, page, created_at, admin_response, admin_responded_at, status, rating, category')
      .order('created_at', { ascending: false }),
    admin
      .from('ai_usage_logs')
      .select('user_id, feature, model, input_tokens, output_tokens, cost_usd, created_at')
      .order('created_at', { ascending: false }),
    admin
      .from('referrals')
      .select('id, referrer_id, referred_id, rewarded_at, created_at')
      .order('created_at', { ascending: false }),
    admin
      .from('referral_clicks')
      .select('referral_code, clicked_at'),
    admin
      .from('user_gamification')
      .select('user_id, total_xp, level'),
    admin
      .from('user_gift_milestones')
      .select('user_id, xp_milestone, voucher_inr, gifted_at, voucher_code, voucher_sent_at, availed_at')
      .order('gifted_at', { ascending: false }),
  ]);

  // Manually join feedback → users (FK now points to auth.users, not public.users)
  const userMap = new Map((usersRes.data ?? []).map(u => [u.id, { name: u.name, email: u.email }]));

  // For feedback from parents (not in public.users), look up from auth.users
  const missingIds = [...new Set(
    (feedbackRes.data ?? []).map(f => f.user_id).filter(id => !userMap.has(id))
  )];
  const parentEntries = await Promise.all(
    missingIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      const rawPhone = (data.user?.user_metadata?.phone as string | undefined) ?? '';
      const phone = formatParentPhone(rawPhone);
      return [id, { name: phone || 'Parent', email: 'Parent Portal' }] as const;
    })
  );
  const fullUserMap = new Map([...userMap, ...parentEntries]);

  const feedback = (feedbackRes.data ?? []).map(f => ({
    ...f,
    user: fullUserMap.get(f.user_id) ?? null,
  }));

  // Deduplicate chapters within each subject (Supabase nested select can return duplicates)
  const deduplicatedUsers = (usersRes.data ?? []).map(u => ({
    ...u,
    subjects: (u.subjects ?? []).map((s: any) => ({
      ...s,
      chapters: Array.from(
        new Map((s.chapters ?? []).map((c: any) => [c.id, c])).values()
      ),
    })),
  }));

  // Fetch parent accounts from auth.users
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const students = deduplicatedUsers;
  const parents = authUsers
    .filter(u => u.email?.endsWith('@parents.educompanion.app'))
    .map(u => {
      const rawPhone = (u.user_metadata?.phone as string | undefined) ?? normalizePhone(u.email?.split('@')[0] ?? '');
      const phone = formatParentPhone(rawPhone);
      const digits = normalizePhone(rawPhone).slice(-10);
      const linkedChildren = students
        .filter(s => normalizePhone(s.phone_number ?? '').slice(-10) === digits && digits.length === 10)
        .map(s => ({ id: s.id as string, name: s.name as string, grade: s.grade as number }));
      return { id: u.id, phone, linkedChildren, createdAt: u.created_at };
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <AdminDashboard users={deduplicatedUsers as any} parents={parents} feedback={feedback as any} usageLogs={(usageRes.data ?? []) as any} referrals={(referralsRes.data ?? []) as any} referralClicks={(clicksRes.data ?? []) as any} gamification={(gamificationRes.data ?? []) as any} milestones={(milestonesRes.data ?? []) as any} />;
}
