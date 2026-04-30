import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { VisualSummaryClient } from '@/components/visual-summary/VisualSummaryClient';

export default async function VisualSummaryPage({ params }: { params: Promise<{ chapterId: string }> }) {
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

  return (
    <VisualSummaryClient
      chapter={{ id: chapter.id, name: chapter.name, upload_status: chapter.upload_status }}
      subjectName={subjectName}
    />
  );
}
