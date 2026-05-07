import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import { SectionDetailClient } from '@/components/sections/SectionDetailClient';

export default async function SectionDetailPage({
  params,
}: {
  params: Promise<{ chapterId: string; sectionId: string }>;
}) {
  const { chapterId, sectionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name, subjects!inner(id, name, user_id)')
    .eq('id', chapterId)
    .single();

  if (!chapter || (chapter.subjects as unknown as { user_id: string }).user_id !== user.id) notFound();

  const admin = createAdminClient();
  const [sectionRes, progressRes, allSectionsRes] = await Promise.all([
    admin.from('chapter_sections')
      .select('id, title, content_text, order_index, estimated_minutes, mini_quiz_json')
      .eq('id', sectionId)
      .eq('chapter_id', chapterId)
      .single(),
    admin.from('section_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('section_id', sectionId)
      .single(),
    admin.from('chapter_sections')
      .select('id, order_index, title')
      .eq('chapter_id', chapterId)
      .order('order_index'),
  ]);

  if (!sectionRes.data) notFound();

  const section = sectionRes.data;
  const allSections = allSectionsRes.data ?? [];
  const currentIdx = allSections.findIndex(s => s.id === sectionId);
  const nextSection = currentIdx >= 0 ? allSections[currentIdx + 1] ?? null : null;

  // Strip correct answers from quiz before sending to client
  const safeQuiz = section.mini_quiz_json
    ? (section.mini_quiz_json as Array<Record<string, unknown>>).map(q => ({
        id: q.id, type: q.type, question: q.question, options: q.options,
      }))
    : null;

  const subjectName = (chapter.subjects as unknown as { name: string }).name;

  return (
    <SectionDetailClient
      chapter={{ id: chapter.id, name: chapter.name }}
      subjectName={subjectName}
      section={{
        id: section.id,
        title: section.title,
        content_text: section.content_text,
        order_index: section.order_index,
        estimated_minutes: section.estimated_minutes,
        mini_quiz: safeQuiz as Array<{ id: string; type: string; question: string; options: string[] }> | null,
        quiz_generating: !section.mini_quiz_json,
        total_sections: allSections.length,
      }}
      progress={progressRes.data ?? null}
      nextSection={nextSection}
    />
  );
}
