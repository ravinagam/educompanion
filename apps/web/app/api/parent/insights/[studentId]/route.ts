import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/parent-auth';
import { generateParentInsights, type InsightInput } from '@/lib/ai/parent-insights';

type Params = { params: Promise<{ studentId: string }> };

async function verifyParentAccess(studentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'parent') return null;

  const parentPhone = normalizePhone(user.user_metadata?.phone ?? '');
  if (!parentPhone) return null;

  const admin = createAdminClient();
  const { data: student } = await admin
    .from('users')
    .select('phone_number, name, grade, board')
    .eq('id', studentId)
    .single();

  if (!student) return null;
  const studentPhone = normalizePhone(student.phone_number ?? '');
  if (studentPhone !== parentPhone) return null;

  return { user, student, admin };
}

export async function GET(_req: Request, { params }: Params) {
  const { studentId } = await params;
  const access = await verifyParentAccess(studentId);
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: cached } = await access.admin
    .from('parent_insights')
    .select('insights_json, generated_at, expires_at')
    .eq('student_id', studentId)
    .single();

  if (cached && new Date(cached.expires_at) > new Date()) {
    return NextResponse.json({ insights: cached.insights_json, generated_at: cached.generated_at, fresh: true });
  }

  return NextResponse.json({ insights: null, fresh: false });
}

export async function POST(_req: Request, { params }: Params) {
  const { studentId } = await params;
  const access = await verifyParentAccess(studentId);
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { admin, student } = access;

  // Gather data for AI
  const [
    { data: gamification },
    { data: subjects },
    { data: mastery },
    { data: quizAttempts },
    { data: flashcardProgress },
  ] = await Promise.all([
    admin.from('user_gamification').select('current_streak, last_active_date').eq('user_id', studentId).single(),
    admin.from('subjects').select('id, name, chapters(id)').eq('user_id', studentId),
    admin.from('chapter_mastery').select('chapter_id, mastered').eq('user_id', studentId),
    admin.from('quiz_attempts')
      .select('score, total, taken_at, quizzes!inner(chapter_id, subjects!inner(name))')
      .eq('user_id', studentId)
      .gte('taken_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()),
    admin.from('flashcard_progress')
      .select('status, flashcards!inner(chapter_id, chapters!inner(subject_id, subjects!inner(name)))')
      .eq('user_id', studentId),
  ]);

  // Compute active days in last 30 from quiz timestamps
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activeDays = new Set(
    (quizAttempts ?? [])
      .filter(a => new Date(a.taken_at) >= last30)
      .map(a => new Date(a.taken_at).toISOString().slice(0, 10))
  ).size;

  const daysSinceActive = gamification?.last_active_date
    ? Math.floor((Date.now() - new Date(gamification.last_active_date).getTime()) / 86400000)
    : 999;

  // Build per-subject snapshots
  const masterySet = new Set((mastery ?? []).filter(m => m.mastered).map(m => m.chapter_id));

  const subjectSnapshots = (subjects ?? []).map(subj => {
    const chapterIds = new Set((subj.chapters ?? []).map((c: { id: string }) => c.id));
    const masteredCount = [...chapterIds].filter(id => masterySet.has(id)).length;

    const subjAttempts = (quizAttempts ?? []).filter((a: any) =>
      (a.quizzes as { subjects: { name: string } })?.subjects?.name === subj.name
    );
    const avgScore = subjAttempts.length > 0
      ? Math.round(subjAttempts.reduce((sum: number, a: any) =>
          sum + (a.total > 0 ? (a.score / a.total) * 100 : 0), 0) / subjAttempts.length)
      : null;

    const recent14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const attemptsLast14 = subjAttempts.filter((a: any) => new Date(a.taken_at) >= recent14d).length;

    const subjFlashcards = (flashcardProgress ?? []).filter((fp: any) =>
      (fp.flashcards as { chapters: { subjects: { name: string } } })?.chapters?.subjects?.name === subj.name
    );
    const known = subjFlashcards.filter((fp: any) => fp.status === 'known').length;

    return {
      name: subj.name,
      chapters_total: chapterIds.size,
      chapters_mastered: masteredCount,
      mastery_pct: chapterIds.size > 0 ? Math.round((masteredCount / chapterIds.size) * 100) : 0,
      avg_quiz_score_pct: avgScore,
      quiz_attempts_last_14d: attemptsLast14,
      flashcards_known: known,
      flashcards_total: subjFlashcards.length,
    };
  });

  const totalChapters = subjectSnapshots.reduce((s, x) => s + x.chapters_total, 0);
  const masteredChapters = subjectSnapshots.reduce((s, x) => s + x.chapters_mastered, 0);
  const allScores = (quizAttempts ?? [])
    .filter((a: any) => a.total > 0)
    .map((a: any) => (a.score / a.total) * 100);
  const overallAvg = allScores.length > 0
    ? Math.round(allScores.reduce((s: number, x: number) => s + x, 0) / allScores.length)
    : null;

  const input: InsightInput = {
    student_name: student.name,
    grade: student.grade,
    board: student.board,
    current_streak: gamification?.current_streak ?? 0,
    days_since_active: daysSinceActive,
    active_days_last_30: activeDays,
    overall_quiz_avg: overallAvg,
    exam_readiness_pct: totalChapters > 0 ? Math.round((masteredChapters / totalChapters) * 100) : 0,
    subjects: subjectSnapshots,
  };

  const insights = await generateParentInsights(input);

  await admin.from('parent_insights').upsert({
    student_id: studentId,
    insights_json: insights,
    generated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: 'student_id' });

  return NextResponse.json({ insights, generated_at: new Date().toISOString(), fresh: true });
}
