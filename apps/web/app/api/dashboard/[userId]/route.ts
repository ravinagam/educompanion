import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];

  const [todayPlans, upcomingTests, recentAttempts, chaptersData] = await Promise.all([
    // Today's study plans
    supabase
      .from('study_plans')
      .select(`
        *,
        chapter:chapters(id, name),
        test:tests!inner(id, name, test_date, user_id)
      `)
      .eq('day_date', today)
      .eq('tests.user_id', userId),

    // Upcoming tests (next 30 days)
    supabase
      .from('tests')
      .select('*')
      .eq('user_id', userId)
      .gte('test_date', today)
      .order('test_date')
      .limit(5),

    // Recent quiz attempts (last 10)
    supabase
      .from('quiz_attempts')
      .select(`
        *,
        quiz:quizzes(chapter_id, chapter:chapters(name))
      `)
      .eq('user_id', userId)
      .order('taken_at', { ascending: false })
      .limit(10),

    // Chapters for mastery calculation
    supabase
      .from('chapters')
      .select(`
        id, name,
        subjects!inner(user_id),
        flashcards(id),
        flashcard_progress:flashcard_progress!inner(status, user_id)
      `)
      .eq('subjects.user_id', userId)
      .eq('upload_status', 'ready'),
  ]);

  // Compute mastery per chapter
  const chapterMastery = (chaptersData.data ?? []).map(ch => {
    const total = (ch.flashcards as Array<{ id: string }>).length;
    const known = (ch.flashcard_progress as Array<{ status: string; user_id: string }>)
      .filter(p => p.user_id === userId && p.status === 'known').length;
    return {
      chapter_id: ch.id,
      chapter_name: ch.name,
      mastery_percent: total > 0 ? Math.round((known / total) * 100) : 0,
    };
  });

  const todayForDate = new Date();
  todayForDate.setHours(0, 0, 0, 0);

  const upcoming = (upcomingTests.data ?? []).map(t => ({
    ...t,
    days_remaining: Math.ceil(
      (new Date(t.test_date).getTime() - todayForDate.getTime()) / 86400000
    ),
  }));

  const recentQuiz = (recentAttempts.data ?? []).map(a => ({
    ...a,
    chapter_name: (a.quiz as { chapter: { name: string } })?.chapter?.name ?? 'Unknown',
  }));

  const overallCompletion = chapterMastery.length > 0
    ? Math.round(chapterMastery.reduce((s, c) => s + c.mastery_percent, 0) / chapterMastery.length)
    : 0;

  return NextResponse.json({
    data: {
      today_plans: todayPlans.data ?? [],
      upcoming_tests: upcoming,
      recent_quiz_attempts: recentQuiz,
      chapter_mastery: chapterMastery,
      overall_completion: overallCompletion,
    },
  });
}
