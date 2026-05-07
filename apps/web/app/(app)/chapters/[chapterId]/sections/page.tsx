import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import { SectionsClient } from '@/components/sections/SectionsClient';

export default async function SectionsPage({ params }: { params: Promise<{ chapterId: string }> }) {
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

  const admin = createAdminClient();
  const [sectionsRes, progressRes] = await Promise.all([
    admin.from('chapter_sections')
      .select('id, title, order_index, estimated_minutes, mini_quiz_json')
      .eq('chapter_id', chapterId)
      .order('order_index'),
    admin.from('section_progress')
      .select('section_id, read_done, chat_done, quiz_score, completed_at')
      .eq('user_id', user.id),
  ]);

  const progressMap = new Map(
    (progressRes.data ?? []).map(p => [p.section_id, p])
  );

  const sections = (sectionsRes.data ?? []).map(s => ({
    id: s.id,
    title: s.title,
    order_index: s.order_index,
    estimated_minutes: s.estimated_minutes,
    has_mini_quiz: s.mini_quiz_json !== null,
    progress: progressMap.get(s.id) ?? null,
  }));

  const subjectName = (chapter.subjects as unknown as { name: string }).name;

  return (
    <SectionsClient
      chapter={{ id: chapter.id, name: chapter.name, upload_status: chapter.upload_status }}
      subjectName={subjectName}
      sections={sections}
    />
  );
}
