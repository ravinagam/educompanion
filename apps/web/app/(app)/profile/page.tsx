import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { ProfileClient } from '@/components/profile/ProfileClient';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const admin = createAdminClient();

  const [profileRes, gamificationRes, quizStatsRes, flashcardStatsRes, masteryRes, milestonesRes, referralRes] = await Promise.all([
    supabase.from('users').select('id, name, email, grade, board, contact_email, phone_number, created_at, referral_code').eq('id', user.id).single(),
    admin.from('user_gamification').select('*').eq('user_id', user.id).single(),
    admin.from('quiz_attempts').select('score, total').eq('user_id', user.id),
    admin.from('flashcard_progress').select('id').eq('user_id', user.id).eq('status', 'known'),
    admin.from('chapter_mastery').select('chapter_id').eq('user_id', user.id).eq('mastered', true),
    admin.from('user_gift_milestones').select('xp_milestone, gifted_at').eq('user_id', user.id),
    admin.from('referrals').select('id').eq('referrer_id', user.id),
  ]);

  if (!profileRes.data) redirect('/auth/login');

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
  const referralCount = referralRes.data?.length ?? 0;
  const referralCode = (profileRes.data as { referral_code?: string | null }).referral_code ?? null;

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
