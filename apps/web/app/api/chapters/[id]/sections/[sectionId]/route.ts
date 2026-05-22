import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateSectionMiniQuiz } from '@/lib/ai/sections';
import { logAiUsage } from '@/lib/ai/usage';
import { awardXp } from '@/lib/gamification';
import { answersMatch } from '@/lib/quiz/scoring';

const SECTION_COMPLETE_XP = 15;
const SECTION_QUIZ_BONUS_XP = 10; // awarded if score >= 80

// GET /api/chapters/[id]/sections/[sectionId]
// Returns full section content + mini-quiz (generates quiz lazily on first visit)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { id: chapterId, sectionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership via chapter → subjects
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name, subjects!inner(user_id)')
    .eq('id', chapterId)
    .single();
  if (!chapter || (chapter.subjects as unknown as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: section } = await admin
    .from('chapter_sections')
    .select('*')
    .eq('id', sectionId)
    .eq('chapter_id', chapterId)
    .single();

  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

  const { data: progress } = await admin
    .from('section_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('section_id', sectionId)
    .single();

  // Generate mini-quiz lazily if not yet created
  if (!section.mini_quiz_json) {
    after(async () => {
      const bgAdmin = createAdminClient();
      try {
        const result = await generateSectionMiniQuiz(
          (chapter as unknown as { name: string }).name,
          section.title,
          section.content_text,
        );
        await bgAdmin.from('chapter_sections')
          .update({ mini_quiz_json: result.data })
          .eq('id', sectionId);
        logAiUsage(user.id, 'section_mini_quiz', result.model, result.input_tokens, result.output_tokens).catch(console.error);
      } catch (err) {
        console.warn('[sections] Mini-quiz generation failed:', err instanceof Error ? err.message : err);
      }
    });
  }

  // Strip correct_answer + explanation from quiz before sending to client
  const safeQuiz = section.mini_quiz_json
    ? (section.mini_quiz_json as Array<Record<string, unknown>>).map(q => ({
        id: q.id, type: q.type, question: q.question, options: q.options,
      }))
    : null;

  return NextResponse.json({
    data: {
      id: section.id,
      title: section.title,
      content_text: section.content_text,
      order_index: section.order_index,
      estimated_minutes: section.estimated_minutes,
      mini_quiz: safeQuiz,
      quiz_generating: !section.mini_quiz_json,
    },
    progress: progress ?? null,
  });
}

// PATCH /api/chapters/[id]/sections/[sectionId]
// Update progress: { read_done?, chat_done?, quiz_answers? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { id: chapterId, sectionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as {
    read_done?: boolean;
    chat_done?: boolean;
    quiz_answers?: Record<string, string>;
  };

  const admin = createAdminClient();

  // Verify ownership
  const { data: section } = await admin
    .from('chapter_sections')
    .select('id, mini_quiz_json, chapter_id')
    .eq('id', sectionId)
    .eq('chapter_id', chapterId)
    .single();
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

  // Fetch existing progress
  const { data: existing } = await admin
    .from('section_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('section_id', sectionId)
    .single();

  const update: Record<string, unknown> = {
    user_id: user.id,
    section_id: sectionId,
  };

  if (body.read_done !== undefined) update.read_done = body.read_done;
  if (body.chat_done !== undefined) update.chat_done = body.chat_done;

  // Score quiz answers server-side
  let quizScore: number | null = existing?.quiz_score ?? null;
  if (body.quiz_answers && section.mini_quiz_json) {
    const questions = section.mini_quiz_json as Array<{ id: string; correct_answer: string }>;
    const total = questions.length;
    const correct = questions.filter((q, i) => answersMatch(body.quiz_answers![i] ?? '', q.correct_answer)).length;
    quizScore = Math.round((correct / total) * 100);
    update.quiz_score = quizScore;
  }

  // Mark fully complete when all 3 steps done
  const readDone = body.read_done ?? existing?.read_done ?? false;
  const chatDone = body.chat_done ?? existing?.chat_done ?? false;
  const quizAttempted = quizScore !== null;
  if (readDone && chatDone && quizAttempted && !existing?.completed_at) {
    update.completed_at = new Date().toISOString();
  }

  const { data: updatedProgress, error } = await admin
    .from('section_progress')
    .upsert(update, { onConflict: 'user_id,section_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Award XP when section first completed
  if (update.completed_at && !existing?.completed_at) {
    awardXp(user.id, SECTION_COMPLETE_XP).catch(console.error);
    if (quizScore !== null && quizScore >= 80) {
      awardXp(user.id, SECTION_QUIZ_BONUS_XP).catch(console.error);
    }
  }

  return NextResponse.json({
    progress: updatedProgress,
    quiz_score: quizScore,
    xp_awarded: update.completed_at && !existing?.completed_at
      ? SECTION_COMPLETE_XP + (quizScore !== null && quizScore >= 80 ? SECTION_QUIZ_BONUS_XP : 0)
      : 0,
  });
}
