import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { FlashcardsClient } from '@/components/flashcards/FlashcardsClient';

export default async function FlashcardsPage({ params }: { params: Promise<{ chapterId: string }> }) {
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

  const { data: flashcards } = await supabase
    .from('flashcards')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at');

  const flashcardIds = (flashcards ?? []).map(f => f.id);
  const { data: progress } = flashcardIds.length > 0
    ? await supabase
        .from('flashcard_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('flashcard_id', flashcardIds)
    : { data: [] };

  const progressMap = new Map((progress ?? []).map(p => [p.flashcard_id, p]));
  const enriched = (flashcards ?? []).map(f => ({ ...f, progress: progressMap.get(f.id) ?? null }));

  const mastery = flashcards?.length
    ? Math.round(((progress ?? []).filter(p => p.status === 'known').length / flashcards.length) * 100)
    : 0;

  return (
    <FlashcardsClient
      chapter={{ id: chapter.id, name: chapter.name, upload_status: chapter.upload_status }}
      subjectName={subjectName}
      flashcards={enriched}
      mastery={mastery}
      userId={user.id}
    />
  );
}
