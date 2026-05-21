import { redirect, notFound } from 'next/navigation';
import { createParentServerClient } from '@/lib/supabase/parent-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/parent-auth';
import { WorksheetsClient } from '@/components/parent/WorksheetsClient';

type Params = { params: Promise<{ studentId: string }> };

export default async function WorksheetsPage({ params }: Params) {
  const { studentId } = await params;

  const supabase = await createParentServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/parent-login');

  const parentPhone = normalizePhone(user.user_metadata?.phone ?? '');
  const admin = createAdminClient();

  // Verify this student belongs to the parent
  const { data: student } = await admin
    .from('users')
    .select('id, name, phone_number')
    .eq('id', studentId)
    .single();

  if (!student) notFound();
  if (normalizePhone(student.phone_number ?? '') !== parentPhone) redirect('/parent');

  // Fetch ready Hindi chapters for this student
  const { data: subjectsRaw } = await admin
    .from('subjects')
    .select('name, chapters(id, name, upload_status)')
    .eq('user_id', studentId);

  const hindiChapters = (subjectsRaw ?? [])
    .filter(s => s.name.toLowerCase().includes('hindi'))
    .flatMap(s =>
      ((s.chapters ?? []) as Array<{ id: string; name: string; upload_status: string }>)
        .filter(c => c.upload_status === 'ready')
        .map(c => ({ id: c.id, name: c.name, subjectName: s.name }))
    );

  // Pre-load cache metadata so the Regenerate button shows immediately on page load
  const chapterIds = hindiChapters.map(c => c.id);
  const { data: cachedWorksheets } = chapterIds.length > 0
    ? await admin.from('hindi_worksheets').select('chapter_id, generated_at').in('chapter_id', chapterIds)
    : { data: [] };

  const initialMeta: Record<string, string> = {};
  (cachedWorksheets ?? []).forEach(w => { initialMeta[w.chapter_id] = w.generated_at; });

  return (
    <WorksheetsClient
      student={{ id: student.id, name: student.name }}
      hindiChapters={hindiChapters}
      initialMeta={initialMeta}
    />
  );
}
