import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/parent-auth';
import { ParentDashboardClient } from '@/components/parent/ParentDashboardClient';
import type { KPIData } from '@/components/parent/KPIGrid';
import type { SubjectData } from '@/components/parent/SubjectMasteryChart';
import type { QuizTrendPoint } from '@/components/parent/QuizTrendChart';
import type { WeakChapter } from '@/components/parent/WeakTopicsPanel';
import type { ParentInsight } from '@/lib/ai/parent-insights';

type Params = { params: Promise<{ studentId: string }> };

export default async function ParentChildPage({ params }: Params) {
  const { studentId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'parent') redirect('/parent-login');

  const parentPhone = normalizePhone(user.user_metadata?.phone ?? '');
  const admin = createAdminClient();

  // Security: verify this student belongs to the parent
  const { data: student } = await admin
    .from('users')
    .select('id, name, grade, board, phone_number')
    .eq('id', studentId)
    .single();

  if (!student) notFound();
  if (normalizePhone(student.phone_number ?? '') !== parentPhone) redirect('/parent');

  // Fetch all data in parallel
  const [
    { data: gamification },
    { data: subjectsRaw },
    { data: masteryRaw },
    { data: quizAttemptsRaw },
    { data: flashcardProgressRaw },
    { data: flashcardsRaw },
    { data: cachedInsights },
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
  ]);

  // Also fetch quizzes to map quiz_id → chapter_id
  const quizIds = [...new Set((quizAttemptsRaw ?? []).map(a => a.quiz_id))];
  const { data: quizzesRaw } = quizIds.length > 0
    ? await admin.from('quizzes').select('id, chapter_id').in('id', quizIds)
    : { data: [] };

  const quizToChapter = new Map((quizzesRaw ?? []).map(q => [q.id, q.chapter_id]));

  // Build lookup maps
  const masteryMap = new Map((masteryRaw ?? []).map(m => [m.chapter_id, m]));
  const allFlashcards = flashcardsRaw ?? [];
  const flashcardsByChapter = new Map<string, string[]>();
  allFlashcards.forEach(f => {
    if (!flashcardsByChapter.has(f.chapter_id)) flashcardsByChapter.set(f.chapter_id, []);
    flashcardsByChapter.get(f.chapter_id)!.push(f.id);
  });
  const knownFlashcards = new Set((flashcardProgressRaw ?? []).filter(fp => fp.status === 'known').map(fp => fp.flashcard_id));

  // Best quiz score per chapter (from quizzes joined via quizAttemptsRaw)
  const bestQuizByChapter = new Map<string, { score: number; total: number; date: string }>();
  (quizAttemptsRaw ?? []).forEach(attempt => {
    const chapterId = quizToChapter.get(attempt.quiz_id);
    if (!chapterId) return;
    const pct = attempt.total > 0 ? attempt.score / attempt.total : 0;
    const existing = bestQuizByChapter.get(chapterId);
    const existingPct = existing ? existing.score / existing.total : -1;
    if (pct > existingPct) bestQuizByChapter.set(chapterId, { score: attempt.score, total: attempt.total, date: attempt.taken_at });
  });

  // Build subject data
  const subjects: SubjectData[] = (subjectsRaw ?? []).map(subj => {
    const chapters = (subj.chapters ?? []) as Array<{ id: string; name: string; upload_status: string }>;
    const readyChapters = chapters.filter(c => c.upload_status === 'ready');

    let totalFlashcards = 0;
    let knownTotal = 0;
    let masteredCount = 0;
    const quizScores: number[] = [];

    readyChapters.forEach(ch => {
      const mastery = masteryMap.get(ch.id);
      if (mastery?.mastered) masteredCount++;

      const chFlashcards = flashcardsByChapter.get(ch.id) ?? [];
      totalFlashcards += chFlashcards.length;
      knownTotal += chFlashcards.filter(id => knownFlashcards.has(id)).length;

      const best = bestQuizByChapter.get(ch.id);
      if (best && best.total > 0) quizScores.push((best.score / best.total) * 100);
    });

    const avgScore = quizScores.length > 0
      ? Math.round(quizScores.reduce((s, x) => s + x, 0) / quizScores.length)
      : null;
    const masteryPct = readyChapters.length > 0 ? Math.round((masteredCount / readyChapters.length) * 100) : 0;

    return {
      name: subj.name,
      chapters_total: readyChapters.length,
      chapters_mastered: masteredCount,
      mastery_pct: masteryPct,
      avg_quiz_score_pct: avgScore,
      flashcards_known: knownTotal,
      flashcards_total: totalFlashcards,
    };
  });

  // Quiz trend points
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
      };
    });

  // Weak chapters detection
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
  // Sort: never_attempted first, then low_score, then not_mastered
  weakChapters.sort((a, b) => {
    const order = { never_attempted: 0, low_score: 1, not_mastered: 2 };
    return order[a.reason] - order[b.reason];
  });

  // Compute overall KPIs
  const totalChapters = subjects.reduce((s, x) => s + x.chapters_total, 0);
  const masteredChapters = subjects.reduce((s, x) => s + x.chapters_mastered, 0);
  const allScores = (quizAttemptsRaw ?? []).filter(a => a.total > 0).map(a => (a.score / a.total) * 100);
  const overallAvg = allScores.length > 0 ? Math.round(allScores.reduce((s, x) => s + x, 0) / allScores.length) : null;

  // Weekly improvement: this week vs last week quiz averages
  const now = Date.now();
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

  // Active days in last 30
  const last30 = now - 30 * 86400000;
  const activeDays = new Set(
    (quizAttemptsRaw ?? [])
      .filter(a => new Date(a.taken_at).getTime() >= last30)
      .map(a => new Date(a.taken_at).toISOString().slice(0, 10))
  ).size;

  const daysSinceActive = gamification?.last_active_date
    ? Math.floor((now - new Date(gamification.last_active_date).getTime()) / 86400000)
    : null;

  // Flashcard totals across all subjects
  const totalFlashcards = subjects.reduce((s, x) => s + x.flashcards_total, 0);
  const knownFlashcardsCount = subjects.reduce((s, x) => s + x.flashcards_known, 0);
  const flashcardRetentionPct = totalFlashcards > 0 ? Math.round((knownFlashcardsCount / totalFlashcards) * 100) : 0;

  const examReadinessPct = totalChapters > 0 ? Math.round((masteredChapters / totalChapters) * 100) : 0;

  const kpi: KPIData = {
    overall_quiz_avg: overallAvg,
    weekly_improvement: weeklyImprovement,
    consistency_pct: Math.round((activeDays / 30) * 100),
    exam_readiness_pct: examReadinessPct,
    current_streak: gamification?.current_streak ?? 0,
    level: gamification?.level ?? 1,
    total_xp: gamification?.total_xp ?? 0,
    flashcard_retention_pct: flashcardRetentionPct,
    chapters_mastered: masteredChapters,
    chapters_total: totalChapters,
    active_days_last_30: activeDays,
    days_since_active: daysSinceActive,
  };

  const weakSubjects = subjects
    .filter(s => s.mastery_pct < 50 && s.chapters_total > 0)
    .map(s => s.name);

  // AI insights (serve cached if fresh, otherwise null — client will trigger POST)
  const isFresh = cachedInsights && new Date(cachedInsights.expires_at) > new Date();
  const initialInsights: ParentInsight | null = isFresh ? (cachedInsights.insights_json as ParentInsight) : null;
  const insightsAt = isFresh ? cachedInsights.generated_at : null;

  return (
    <ParentDashboardClient
      student={{ id: student.id, name: student.name, grade: student.grade, board: student.board }}
      kpi={kpi}
      subjects={subjects}
      quizTrend={quizTrend}
      weakChapters={weakChapters}
      weakSubjects={weakSubjects}
      initialInsights={initialInsights}
      insightsGeneratedAt={insightsAt}
    />
  );
}
