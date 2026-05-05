import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { ProfileClient } from '@/components/profile/ProfileClient';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const admin = createAdminClient();

  const [profileRes, gamificationRes, quizStatsRes, flashcardStatsRes, masteryRes] = await Promise.all([
    supabase.from('users').select('id, name, email, grade, board, contact_email, phone_number, created_at').eq('id', user.id).single(),
    admin.from('user_gamification').select('*').eq('user_id', user.id).single(),
    admin.from('quiz_attempts').select('score, total').eq('user_id', user.id),
    admin.from('flashcard_progress').select('id').eq('user_id', user.id).eq('status', 'known'),
    admin.from('chapter_mastery').select('chapter_id').eq('user_id', user.id).eq('mastered', true),
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

  return (
    <ProfileClient
      profile={profileRes.data as Parameters<typeof ProfileClient>[0]['profile']}
      stats={stats}
    />
  );
}
