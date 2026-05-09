import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { SavedChaptersClient } from '@/components/chapters/SavedChaptersClient';

export default async function ChaptersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: subjects } = await supabase
    .from('subjects')
    .select('*, chapters(id, name, upload_status, complexity_score, created_at, file_name, file_size_bytes, error_message)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const allChapterIds = (subjects ?? []).flatMap(s =>
    (s.chapters as Array<{ id: string }>).map(c => c.id)
  );

  // Fetch section counts and user progress only when chapters exist
  const sectionCountMap = new Map<string, number>();
  const sectionCompletedMap = new Map<string, number>();

  if (allChapterIds.length > 0) {
    const admin = createAdminClient();
    const [sectionsRes, progressRes] = await Promise.all([
      admin.from('chapter_sections').select('id, chapter_id').in('chapter_id', allChapterIds),
      supabase.from('section_progress').select('section_id, completed_at').eq('user_id', user.id),
    ]);

    const sectionIdToChapter = new Map<string, string>();
    for (const s of sectionsRes.data ?? []) {
      sectionIdToChapter.set(s.id, s.chapter_id);
      sectionCountMap.set(s.chapter_id, (sectionCountMap.get(s.chapter_id) ?? 0) + 1);
    }
    for (const p of progressRes.data ?? []) {
      if (!p.completed_at) continue;
      const chapterId = sectionIdToChapter.get(p.section_id);
      if (chapterId) sectionCompletedMap.set(chapterId, (sectionCompletedMap.get(chapterId) ?? 0) + 1);
    }
  }

  const subjectsWithProgress = (subjects ?? []).map(s => ({
    ...s,
    chapters: (s.chapters as Array<{ id: string }>).map(c => ({
      ...c,
      section_total: sectionCountMap.get(c.id) ?? 0,
      section_completed: sectionCompletedMap.get(c.id) ?? 0,
    })),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <SavedChaptersClient subjects={subjectsWithProgress as any} />;
}
