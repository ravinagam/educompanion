import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { nextMilestone } from '@/lib/gamification';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const today = new Date().toISOString().split('T')[0];
  const admin = createAdminClient();

  const [todayPlansRes, upcomingTestsRes, recentAttemptsRes, gamificationRes, milestonesRes] = await Promise.all([
    supabase
      .from('study_plans')
      .select(`*, chapter:chapters(id, name, subjects(id, name)), test:tests!inner(id, name, test_date, user_id)`)
      .eq('day_date', today)
      .eq('tests.user_id', user.id),
    supabase
      .from('tests')
      .select('*')
      .eq('user_id', user.id)
      .gte('test_date', today)
      .order('test_date')
      .limit(5),
    supabase
      .from('quiz_attempts')
      .select(`*, quiz:quizzes(chapter_id, chapter:chapters(name, subject:subjects(name)))`)
      .eq('user_id', user.id)
      .order('taken_at', { ascending: false })
      .limit(8),
    admin.from('user_gamification').select('total_xp').eq('user_id', user.id).single(),
    admin.from('user_gift_milestones').select('xp_milestone').eq('user_id', user.id),
  ]);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const upcomingTests = (upcomingTestsRes.data ?? []).map(t => ({
    ...t,
    days_remaining: Math.ceil((new Date(t.test_date).getTime() - todayDate.getTime()) / 86400000),
  }));

  const recentAttempts = (recentAttemptsRes.data ?? []).map(a => ({
    ...a,
    chapter_name: (a.quiz as { chapter: { name: string; subject: { name: string } } })?.chapter?.name ?? 'Unknown',
    subject_name: (a.quiz as { chapter: { subject: { name: string } } })?.chapter?.subject?.name ?? '',
    difficulty: (a as { difficulty?: string }).difficulty ?? 'medium',
  }));

  const totalXp = gamificationRes.data?.total_xp ?? 0;
  const claimedXpLevels = (milestonesRes.data ?? []).map((r: { xp_milestone: number }) => r.xp_milestone);
  const next = nextMilestone(totalXp, claimedXpLevels);
  const nextReward = next ? { label: next.label, xpNeeded: next.xp - totalXp } : null;

  return (
    <DashboardClient
      userId={user.id}
      userName={user.user_metadata?.name || user.user_metadata?.username || 'Student'}
      todayPlans={todayPlansRes.data ?? []}
      upcomingTests={upcomingTests}
      recentAttempts={recentAttempts}
      nextReward={nextReward}
    />
  );
}
