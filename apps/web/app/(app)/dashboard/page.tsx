import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from '@/components/dashboard/DashboardClient';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const today = new Date().toISOString().split('T')[0];

  const [todayPlansRes, upcomingTestsRes, recentAttemptsRes] = await Promise.all([
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

  return (
    <DashboardClient
      userId={user.id}
      todayPlans={todayPlansRes.data ?? []}
      upcomingTests={upcomingTests}
      recentAttempts={recentAttempts}
    />
  );
}
