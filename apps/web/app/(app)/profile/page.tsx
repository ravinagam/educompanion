import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { ProfileClient } from '@/components/profile/ProfileClient';

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const admin = createAdminClient();

  // Core queries — must succeed for the page to render
  const [profileRes, gamificationRes, quizStatsRes, flashcardStatsRes, masteryRes, milestonesRes] = await Promise.all([
    supabase.from('users').select('id, name, email, grade, board, contact_email, phone_number, created_at').eq('id', user.id).single(),
    admin.from('user_gamification').select('*').eq('user_id', user.id).single(),
    admin.from('quiz_attempts').select('score, total').eq('user_id', user.id),
    admin.from('flashcard_progress').select('id').eq('user_id', user.id).eq('status', 'known'),
    admin.from('chapter_mastery').select('chapter_id').eq('user_id', user.id).eq('mastered', true),
    admin.from('user_gift_milestones').select('xp_milestone, gifted_at').eq('user_id', user.id),
  ]);

  if (!profileRes.data) redirect('/auth/login');

  // Referral queries — optional; silently degrade if migration 025 not yet applied
  const [referralCodeRes, referralCountRes] = await Promise.all([
    admin.from('users').select('referral_code').eq('id', user.id).single(),
    admin.from('referrals').select('id').eq('referrer_id', user.id),
  ]);

  // Auto-generate a referral code for existing users who don't have one yet
  // (migration applied but user signed up before the referral feature)
  let referralCode = (referralCodeRes.data as { referral_code?: string | null } | null)?.referral_code ?? null;
  if (referralCodeRes.data !== null && referralCode === null) {
    const newCode = generateReferralCode();
    const { error: codeErr } = await admin
      .from('users')
      .update({ referral_code: newCode })
      .eq('id', user.id);
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

  const claimedMilestones: { xp_milestone: number; gifted_at: string }[] = milestonesRes.data ?? [];
  const referralCount = referralCountRes.data?.length ?? 0;

  return (
    <ProfileClient
      profile={profileRes.data as Parameters<typeof ProfileClient>[0]['profile']}
      stats={stats}
      claimedMilestones={claimedMilestones}
      referralCode={referralCode}
      referralCount={referralCount}
    />
  );
}
