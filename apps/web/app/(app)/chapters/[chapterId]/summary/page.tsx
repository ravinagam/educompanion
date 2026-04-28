import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import { ChapterSummaryClient } from '@/components/summary/ChapterSummaryClient';

export default async function ChapterSummaryPage({ params }: { params: Promise<{ chapterId: string }> }) {
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

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('chapter_summaries')
    .select('summary_json')
    .eq('chapter_id', chapterId)
    .single();

  return (
    <ChapterSummaryClient
      chapter={{ id: chapter.id, name: chapter.name }}
      subjectName={subjectName}
      initialSummary={existing?.summary_json ?? null}
    />
  );
}
