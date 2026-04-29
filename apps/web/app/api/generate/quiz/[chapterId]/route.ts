import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateQuiz } from '@/lib/ai/claude';
import { logAiUsage } from '@/lib/ai/usage';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  const { chapterId } = await params;
  const body = await request.json().catch(() => ({}));
  const difficulty: 'easy' | 'medium' | 'hard' = ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : 'medium';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify chapter ownership + status
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name, content_text, upload_status, subjects!inner(user_id)')
    .eq('id', chapterId)
    .single();

  if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
  if ((chapter.subjects as unknown as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (chapter.upload_status !== 'ready') {
    return NextResponse.json({ error: 'Chapter not ready yet' }, { status: 400 });
  }
  const wordCount = (chapter.content_text ?? '').trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 50) {
    return NextResponse.json({ error: 'This PDF appears to be scanned (image-based) and contains no extractable text. Please upload a text-based PDF, DOCX, or TXT file.' }, { status: 400 });
  }

  // Check if a quiz already exists — if so, this is a regeneration
  const { data: existingQuiz } = await supabase
    .from('quizzes')
    .select('id')
    .eq('chapter_id', chapterId)
    .single();

  const variationHint = existingQuiz
    ? `This is a regeneration (attempt #${Date.now() % 1000}). Generate completely different questions than before.`
    : '';

  let questions;
  try {
    const result = await generateQuiz(chapter.name, chapter.content_text, variationHint, difficulty);
    questions = result.data;
    logAiUsage(user.id, 'quiz', result.model, result.input_tokens, result.output_tokens).catch(console.error);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const admin = createAdminClient();

  // Upsert quiz
  const { data: existing } = await admin
    .from('quizzes')
    .select('id')
    .eq('chapter_id', chapterId)
    .single();

  let quiz;
  if (existing) {
    const { data } = await admin
      .from('quizzes')
      .update({ questions_json: questions })
      .eq('id', existing.id)
      .select()
      .single();
    quiz = data;
  } else {
    const { data } = await admin
      .from('quizzes')
      .insert({ chapter_id: chapterId, questions_json: questions })
      .select()
      .single();
    quiz = data;
  }

  return NextResponse.json({ data: quiz });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  const { chapterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('chapter_id', chapterId)
    .single();

  if (!quiz) return NextResponse.json({ data: null });

  // CRITICAL: Strip correct_answer from questions before sending to client
  // Client receives sanitized questions; answers only sent after submission
  const sanitized = {
    ...quiz,
    questions_json: (quiz.questions_json as Array<Record<string, unknown>>).map(q => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options,
      // correct_answer and explanation intentionally omitted
    })),
  };

  return NextResponse.json({ data: sanitized });
}
