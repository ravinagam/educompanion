import { redirect } from 'next/navigation';
import { createParentServerClient } from '@/lib/supabase/parent-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/parent-auth';
import { generateReferralCode } from '@/lib/utils/referral-code';
import { ParentReferClient } from '@/components/parent/ParentReferClient';

export default async function ParentReferPage() {
  const supabase = await createParentServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/parent-login');

  const parentPhone = normalizePhone(user.user_metadata?.phone ?? '');
  const admin = createAdminClient();

  const { data: allStudents } = await admin
    .from('users')
    .select('id, name, grade, board, phone_number, referral_code');

  const matched = (allStudents ?? []).filter(s => {
    const digits = normalizePhone(s.phone_number ?? '');
    return digits && digits === parentPhone;
  });

  if (matched.length === 0) redirect('/parent');

  const children = await Promise.all(
    matched.map(async (child) => {
      let referralCode: string | null = (child as { referral_code?: string | null }).referral_code ?? null;

      if (referralCode === null) {
        const newCode = generateReferralCode();
        const { error } = await admin.from('users').update({ referral_code: newCode }).eq('id', child.id);
        if (!error) referralCode = newCode;
      }

      // Fetch referrals with referred friend details
      const { data: referralRows } = await admin
        .from('referrals')
        .select('id, referred_id, rewarded_at, created_at, referred:users!referred_id(name, grade, board, created_at)')
        .eq('referrer_id', child.id)
        .order('created_at', { ascending: false });

      const friends = (referralRows ?? []).map((r) => {
        const referred = r.referred as unknown as { name: string; grade: number; board: string; created_at: string } | null;
        return {
          id: r.referred_id as string,
          name: referred?.name ?? 'Unknown',
          grade: referred?.grade ?? 0,
          board: referred?.board ?? '',
          joinedAt: r.created_at as string,
          rewarded: !!(r.rewarded_at),
        };
      });

      return {
        id: child.id,
        name: child.name as string,
        grade: child.grade as number,
        board: child.board as string,
        referralCode,
        referralCount: friends.length,
        friends,
      };
    })
  );

  return <ParentReferClient children={children} />;
}
