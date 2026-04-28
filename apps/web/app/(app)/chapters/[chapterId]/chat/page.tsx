import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { ChapterChatClient } from '@/components/chat/ChapterChatClient';

export default async function ChapterChatPage({ params }: { params: Promise<{ chapterId: string }> }) {
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
  if (chapter.upload_status !== 'ready') redirect(`/chapters`);

  const subjectName = (chapter.subjects as unknown as { name: string }).name;

  return (
    <ChapterChatClient
      chapter={{ id: chapter.id, name: chapter.name }}
      subjectName={subjectName}
    />
  );
}
