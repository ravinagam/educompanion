import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { StudentPerformanceClient } from '@/components/student/StudentPerformanceClient';
import type { KPIData } from '@/components/parent/KPIGrid';
import type { SubjectData } from '@/components/parent/SubjectMasteryChart';
import type { QuizTrendPoint } from '@/components/parent/QuizTrendChart';
import type { WeakChapter } from '@/components/parent/WeakTopicsPanel';
import type { ParentInsight } from '@/lib/ai/parent-insights';

export default async function MyPerformancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const studentId = user.id;
  const admin = createAdminClient();

  const { data: studentProfile } = await admin
    .from('users')
    .select('id, name, grade, board')
    .eq('id', studentId)
    .single();

  if (!studentProfile) redirect('/dashboard');

  const [
    { data: gamification },
    { data: subjectsRaw },
    { data: masteryRaw },
    { data: quizAttemptsRaw },
    { data: flashcardProgressRaw },
    { data: flashcardsRaw },
    { data: cachedInsights },
    { data: milestonesRaw },
  ] = await Promise.all([
    admin.from('user_gamification').select('*').eq('user_id', studentId).single(),
    admin.from('subjects').select('id, name, chapters(id, name, upload_status)').eq('user_id', studentId),
    admin.from('chapter_mastery').select('chapter_id, mastered, quiz_done, flashcards_known').eq('user_id', studentId),
    admin.from('quiz_attempts')
      .select('score, total, taken_at, quiz_id')
      .eq('user_id', studentId)
      .gte('taken_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
      .order('taken_at', { ascending: true }),
    admin.from('flashcard_progress').select('flashcard_id, status').eq('user_id', studentId),
    admin.from('flashcards').select('id, chapter_id'),
    admin.from('parent_insights').select('insights_json, generated_at, expires_at').eq('student_id', studentId).single(),
    admin.from('user_gift_milestones').select('xp_milestone, voucher_inr, gifted_at, voucher_code, availed_at').eq('user_id', studentId),
  ]);

  const quizIds = [...new Set((quizAttemptsRaw ?? []).map(a => a.quiz_id))];
  const { data: quizzesRaw } = quizIds.length > 0
    ? await admin.from('quizzes').select('id, chapter_id').in('id', quizIds)
    : { data: [] };

  const quizToChapter = new Map((quizzesRaw ?? []).map(q => [q.id, q.chapter_id]));
  const masteryMap = new Map((masteryRaw ?? []).map(m => [m.chapter_id, m]));
  const allFlashcards = flashcardsRaw ?? [];
  const flashcardsByChapter = new Map<string, string[]>();
  allFlashcards.forEach(f => {
    if (!flashcardsByChapter.has(f.chapter_id)) flashcardsByChapter.set(f.chapter_id, []);
    flashcardsByChapter.get(f.chapter_id)!.push(f.id);
  });
  const knownFlashcards = new Set(
    (flashcardProgressRaw ?? []).filter(fp => fp.status === 'known').map(fp => fp.flashcard_id)
  );

  const bestQuizByChapter = new Map<string, { score: number; total: number; date: string }>();
  (quizAttemptsRaw ?? []).forEach(attempt => {
    const chapterId = quizToChapter.get(attempt.quiz_id);
    if (!chapterId) return;
    const pct = attempt.total > 0 ? attempt.score / attempt.total : 0;
    const existing = bestQuizByChapter.get(chapterId);
    const existingPct = existing ? existing.score / existing.total : -1;
    if (pct > existingPct) bestQuizByChapter.set(chapterId, { score: attempt.score, total: attempt.total, date: attempt.taken_at });
  });

  const subjects: SubjectData[] = (subjectsRaw ?? []).map(subj => {
    const chapters = (subj.chapters ?? []) as Array<{ id: string; name: string; upload_status: string }>;
    const readyChapters = chapters.filter(c => c.upload_status === 'ready');
    let totalFlashcards = 0, knownTotal = 0, masteredCount = 0;
    const quizScores: number[] = [];
    readyChapters.forEach(ch => {
      if (masteryMap.get(ch.id)?.mastered) masteredCount++;
      const chFlashcards = flashcardsByChapter.get(ch.id) ?? [];
      totalFlashcards += chFlashcards.length;
      knownTotal += chFlashcards.filter(id => knownFlashcards.has(id)).length;
      const best = bestQuizByChapter.get(ch.id);
      if (best && best.total > 0) quizScores.push((best.score / best.total) * 100);
    });
    return {
      name: subj.name,
      chapters_total: readyChapters.length,
      chapters_mastered: masteredCount,
      mastery_pct: readyChapters.length > 0 ? Math.round((masteredCount / readyChapters.length) * 100) : 0,
      avg_quiz_score_pct: quizScores.length > 0
        ? Math.round(quizScores.reduce((s, x) => s + x, 0) / quizScores.length)
        : null,
      flashcards_known: knownTotal,
      flashcards_total: totalFlashcards,
    };
  });

  const chapterNameMap = new Map<string, string>();
  (subjectsRaw ?? []).forEach(subj => {
    (subj.chapters ?? []).forEach((ch: { id: string; name: string }) => {
      chapterNameMap.set(ch.id, ch.name);
    });
  });

  const quizTrend: QuizTrendPoint[] = (quizAttemptsRaw ?? [])
    .filter(a => a.total > 0)
    .map(a => {
      const chapterId = quizToChapter.get(a.quiz_id) ?? '';
      const subject = (subjectsRaw ?? []).find(s =>
        (s.chapters ?? []).some((c: { id: string }) => c.id === chapterId)
      )?.name ?? 'Other';
      return {
        date: a.taken_at,
        score_pct: Math.round((a.score / a.total) * 100),
        subject,
        chapter_name: chapterNameMap.get(chapterId),
        score_raw: `${a.score}/${a.total}`,
      };
    });

  const weakChapters: WeakChapter[] = [];
  (subjectsRaw ?? []).forEach(subj => {
    const chapters = (subj.chapters ?? []) as Array<{ id: string; name: string; upload_status: string }>;
    chapters.filter(c => c.upload_status === 'ready').forEach(ch => {
      const best = bestQuizByChapter.get(ch.id);
      const mastery = masteryMap.get(ch.id);
      if (!best) {
        weakChapters.push({ subject: subj.name, chapter: ch.name, reason: 'never_attempted', score_pct: null });
      } else if (best.total > 0 && (best.score / best.total) < 0.6) {
        weakChapters.push({ subject: subj.name, chapter: ch.name, reason: 'low_score', score_pct: Math.round((best.score / best.total) * 100) });
      } else if (!mastery?.mastered) {
        weakChapters.push({ subject: subj.name, chapter: ch.name, reason: 'not_mastered', score_pct: best.total > 0 ? Math.round((best.score / best.total) * 100) : null });
      }
    });
  });
  weakChapters.sort((a, b) => {
    const order = { never_attempted: 0, low_score: 1, not_mastered: 2 };
    return order[a.reason] - order[b.reason];
  });

  const now = Date.now();
  const totalChapters = subjects.reduce((s, x) => s + x.chapters_total, 0);
  const masteredChapters = subjects.reduce((s, x) => s + x.chapters_mastered, 0);
  const allScores = (quizAttemptsRaw ?? []).filter(a => a.total > 0).map(a => (a.score / a.total) * 100);
  const overallAvg = allScores.length > 0 ? Math.round(allScores.reduce((s, x) => s + x, 0) / allScores.length) : null;

  const thisWeekScores = (quizAttemptsRaw ?? []).filter(a => {
    const d = now - new Date(a.taken_at).getTime();
    return d <= 7 * 86400000 && a.total > 0;
  }).map(a => (a.score / a.total) * 100);
  const lastWeekScores = (quizAttemptsRaw ?? []).filter(a => {
    const d = now - new Date(a.taken_at).getTime();
    return d > 7 * 86400000 && d <= 14 * 86400000 && a.total > 0;
  }).map(a => (a.score / a.total) * 100);
  let weeklyImprovement: number | null = null;
  if (thisWeekScores.length > 0 && lastWeekScores.length > 0) {
    const thisAvg = thisWeekScores.reduce((s, x) => s + x, 0) / thisWeekScores.length;
    const lastAvg = lastWeekScores.reduce((s, x) => s + x, 0) / lastWeekScores.length;
    weeklyImprovement = Math.round(thisAvg - lastAvg);
  }

  const activeDays = new Set(
    (quizAttemptsRaw ?? [])
      .filter(a => new Date(a.taken_at).getTime() >= now - 30 * 86400000)
      .map(a => new Date(a.taken_at).toISOString().slice(0, 10))
  ).size;

  const daysSinceActive = gamification?.last_active_date
    ? Math.floor((now - new Date(gamification.last_active_date).getTime()) / 86400000)
    : null;

  const totalFlashcards = subjects.reduce((s, x) => s + x.flashcards_total, 0);
  const knownFlashcardsCount = subjects.reduce((s, x) => s + x.flashcards_known, 0);

  const kpi: KPIData = {
    overall_quiz_avg: overallAvg,
    weekly_improvement: weeklyImprovement,
    consistency_pct: Math.round((activeDays / 30) * 100),
    exam_readiness_pct: totalChapters > 0 ? Math.round((masteredChapters / totalChapters) * 100) : 0,
    current_streak: gamification?.current_streak ?? 0,
    level: gamification?.level ?? 1,
    total_xp: gamification?.total_xp ?? 0,
    flashcard_retention_pct: totalFlashcards > 0 ? Math.round((knownFlashcardsCount / totalFlashcards) * 100) : 0,
    chapters_mastered: masteredChapters,
    chapters_total: totalChapters,
    active_days_last_30: activeDays,
    days_since_active: daysSinceActive,
  };

  const isFresh = cachedInsights && new Date(cachedInsights.expires_at) > new Date();
  const initialInsights: ParentInsight | null = isFresh ? (cachedInsights.insights_json as ParentInsight) : null;
  const insightsAt = isFresh ? cachedInsights.generated_at : null;

  return (
    <StudentPerformanceClient
      student={{ id: studentProfile.id, name: studentProfile.name, grade: studentProfile.grade, board: studentProfile.board }}
      kpi={kpi}
      subjects={subjects}
      quizTrend={quizTrend}
      weakChapters={weakChapters}
      weakSubjects={subjects.filter(s => s.mastery_pct < 50 && s.chapters_total > 0).map(s => s.name)}
      initialInsights={initialInsights}
      insightsGeneratedAt={insightsAt}
      milestones={milestonesRaw ?? []}
    />
  );
}
