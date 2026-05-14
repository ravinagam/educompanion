import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { RewardsClient } from '@/components/profile/RewardsClient';

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default async function RewardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const admin = createAdminClient();

  const [profileRes, gamificationRes, quizStatsRes, flashcardStatsRes, masteryRes, milestonesRes] = await Promise.all([
    supabase.from('users').select('id, name, grade, board, phone_number').eq('id', user.id).single(),
    admin.from('user_gamification').select('*').eq('user_id', user.id).single(),
    admin.from('quiz_attempts').select('score, total').eq('user_id', user.id),
    admin.from('flashcard_progress').select('id').eq('user_id', user.id).eq('status', 'known'),
    admin.from('chapter_mastery').select('chapter_id').eq('user_id', user.id).eq('mastered', true),
    admin.from('user_gift_milestones').select('xp_milestone, gifted_at, voucher_code, availed_at').eq('user_id', user.id),
  ]);

  if (!profileRes.data) redirect('/auth/login');

  const [referralCodeRes, referralCountRes] = await Promise.all([
    admin.from('users').select('referral_code').eq('id', user.id).single(),
    admin.from('referrals').select('id').eq('referrer_id', user.id),
  ]);

  let referralCode = (referralCodeRes.data as { referral_code?: string | null } | null)?.referral_code ?? null;
  if (referralCodeRes.data !== null && referralCode === null) {
    const newCode = generateReferralCode();
    const { error: codeErr } = await admin.from('users').update({ referral_code: newCode }).eq('id', user.id);
    if (!codeErr) referralCode = newCode;
  }

  const quizAttempts = quizStatsRes.data ?? [];
  const totalQuizzes = quizAttempts.length;
  const avgScore = totalQuizzes > 0
    ? Math.round(quizAttempts.reduce((sum, a) => sum + (a.total > 0 ? a.score / a.total : 0), 0) / totalQuizzes * 100)
    : 0;

  const stats = {
    gamification: gamificationRes.data ?? null,
    totalQuizzes,
    avgScore,
    flashcardsKnown: flashcardStatsRes.data?.length ?? 0,
    chaptersMastered: masteryRes.data?.length ?? 0,
  };

  return (
    <RewardsClient
      profile={profileRes.data as Parameters<typeof RewardsClient>[0]['profile']}
      stats={stats}
      claimedMilestones={milestonesRes.data ?? []}
      referralCode={referralCode}
      referralCount={referralCountRes.data?.length ?? 0}
    />
  );
}
