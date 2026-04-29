import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { QuizClient } from '@/components/quiz/QuizClient';

export default async function QuizPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name, upload_status, subjects!inner(id, name, user_id)')
    .eq('id', chapterId)
    .single();

  if (!chapter || (chapter.subjects as unknown as { user_id: string }).user_id !== user.id) notFound();
  const subjectName = (chapter.subjects as unknown as { name: string }).name;

  // Fetch quiz directly from DB and sanitize answers server-side
  const { data: rawQuiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('chapter_id', chapterId)
    .single();

  const quiz = rawQuiz
    ? {
        ...rawQuiz,
        questions_json: (rawQuiz.questions_json as Array<Record<string, unknown>>).map(q => ({
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options,
          // correct_answer and explanation intentionally omitted — scored server-side
        })),
      }
    : null;

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('id, score, total, taken_at, difficulty')
    .eq('user_id', user.id)
    .eq('quiz_id', rawQuiz?.id ?? '')
    .order('taken_at', { ascending: false })
    .limit(5);

  return (
    <QuizClient
      chapter={{ id: chapter.id, name: chapter.name, upload_status: chapter.upload_status }}
      subjectName={subjectName}
      quiz={quiz}
      attempts={attempts ?? []}
      userId={user.id}
    />
  );
}
