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

  const [
    todayPlansRes,
    upcomingTestsRes,
    recentAttemptsRes,
    gamificationRes,
    milestonesRes,
    flashcardsRes,
    quizStatsRes,
    subjectsRes,
  ] = await Promise.all([
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
    admin.from('user_gamification').select('total_xp, level, current_streak').eq('user_id', user.id).single(),
    admin.from('user_gift_milestones').select('xp_milestone').eq('user_id', user.id),
    admin.from('flashcard_progress').select('id').eq('user_id', user.id).eq('status', 'known'),
    admin.from('quiz_attempts').select('score, total').eq('user_id', user.id),
    supabase
      .from('subjects')
      .select('id, chapters(id, name, upload_status)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
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
  const nextReward = next ? { label: next.label, xpNeeded: next.xp - totalXp, xpTotal: next.xp } : null;

  // Quiz average
  const quizAttempts = quizStatsRes.data ?? [];
  const quizAvg = quizAttempts.length > 0
    ? Math.round(quizAttempts.reduce((sum, a) => sum + (a.total > 0 ? a.score / a.total : 0), 0) / quizAttempts.length * 100)
    : 0;

  // Chapter progress: fetch section counts for recent chapters
  const recentChapters = (subjectsRes.data ?? [])
    .flatMap(s => (s.chapters as Array<{ id: string; name: string; upload_status: string }>)
      .filter(c => c.upload_status === 'complete')
      .map(c => ({ id: c.id, name: c.name }))
    )
    .slice(0, 5);

  const chapterProgress: Array<{ id: string; name: string; section_total: number; section_completed: number }> = [];

  if (recentChapters.length > 0) {
    const chapterIds = recentChapters.map(c => c.id);
    const [sectionsRes, progressRes] = await Promise.all([
      admin.from('chapter_sections').select('id, chapter_id').in('chapter_id', chapterIds),
      supabase.from('section_progress').select('section_id, completed_at').eq('user_id', user.id),
    ]);

    const sectionIdToChapter = new Map<string, string>();
    const sectionCountMap = new Map<string, number>();
    const sectionCompletedMap = new Map<string, number>();

    for (const s of sectionsRes.data ?? []) {
      sectionIdToChapter.set(s.id, s.chapter_id);
      sectionCountMap.set(s.chapter_id, (sectionCountMap.get(s.chapter_id) ?? 0) + 1);
    }
    for (const p of progressRes.data ?? []) {
      if (!p.completed_at) continue;
      const cid = sectionIdToChapter.get(p.section_id);
      if (cid) sectionCompletedMap.set(cid, (sectionCompletedMap.get(cid) ?? 0) + 1);
    }

    for (const c of recentChapters) {
      const total = sectionCountMap.get(c.id) ?? 0;
      if (total > 0) {
        chapterProgress.push({
          id: c.id,
          name: c.name,
          section_total: total,
          section_completed: sectionCompletedMap.get(c.id) ?? 0,
        });
      }
    }
  }

  return (
    <DashboardClient
      userId={user.id}
      userName={user.user_metadata?.name || user.user_metadata?.username || 'Student'}
      todayPlans={todayPlansRes.data ?? []}
      upcomingTests={upcomingTests}
      recentAttempts={recentAttempts}
      nextReward={nextReward}
      gamification={gamificationRes.data ?? null}
      flashcardsKnown={flashcardsRes.data?.length ?? 0}
      quizAvg={quizAvg}
      chapterProgress={chapterProgress}
    />
  );
}
