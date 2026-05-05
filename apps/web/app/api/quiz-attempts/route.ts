import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { awardXp, XP_REWARDS } from '@/lib/gamification';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { quizId, answers, difficulty } = await request.json();
  // answers: { [questionId]: chosenAnswer }

  if (!quizId || !answers) {
    return NextResponse.json({ error: 'quizId and answers required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: quiz } = await admin
    .from('quizzes')
    .select('questions_json')
    .eq('id', quizId)
    .single();

  if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

  const questions = quiz.questions_json as Array<{
    id: string;
    correct_answer: string;
    explanation: string;
    question: string;
    type: string;
    options?: string[];
  }>;

  // Score the attempt server-side
  let score = 0;
  const results: Array<{
    questionId: string;
    correct: boolean;
    chosen: string;
    correct_answer: string;
    explanation: string;
  }> = [];

  for (const q of questions) {
    const chosen = answers[q.id] ?? '';
    const correct = chosen.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
    if (correct) score++;
    results.push({
      questionId: q.id,
      correct,
      chosen,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    });
  }

  const { data: attempt, error } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: user.id,
      quiz_id: quizId,
      score,
      total: questions.length,
      answers_json: answers,
      difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Award XP with streak multiplier (non-fatal)
  const pct = questions.length > 0 ? score / questions.length : 0;
  const xpBase = XP_REWARDS.quiz_completed + (pct >= 0.8 ? XP_REWARDS.quiz_bonus_80pct : 0);
  let xpAwarded = xpBase;
  let multiplier = 1;
  try {
    const award = await awardXp(user.id, xpBase);
    xpAwarded = award.xp_awarded;
    multiplier = award.multiplier;
  } catch { /* non-fatal */ }

  return NextResponse.json({
    data: { attempt, results, score, total: questions.length, xp_awarded: xpAwarded, xp_multiplier: multiplier },
  });
}
