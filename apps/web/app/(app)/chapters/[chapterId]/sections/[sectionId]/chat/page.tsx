import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import { ChapterChatClient } from '@/components/chat/ChapterChatClient';

export default async function SectionChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapterId: string; sectionId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { chapterId, sectionId } = await params;
  const { q } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name, upload_status, subjects!inner(id, name, user_id)')
    .eq('id', chapterId)
    .single();

  if (!chapter || (chapter.subjects as unknown as { user_id: string }).user_id !== user.id) notFound();
  if (chapter.upload_status !== 'ready') redirect(`/chapters/${chapterId}/sections`);

  const admin = createAdminClient();
  const { data: section } = await admin
    .from('chapter_sections')
    .select('id, title')
    .eq('id', sectionId)
    .eq('chapter_id', chapterId)
    .single();

  if (!section) notFound();

  const subjectName = (chapter.subjects as unknown as { name: string }).name;

  return (
    <ChapterChatClient
      chapter={{ id: chapter.id, name: chapter.name }}
      subjectName={subjectName}
      apiUrl={`/api/chapters/${chapterId}/sections/${sectionId}/chat`}
      backHref={`/chapters/${chapterId}/sections/${sectionId}`}
      contextLabel="this section"
      sectionTitle={section.title}
      initialQuestion={q}
    />
  );
}
