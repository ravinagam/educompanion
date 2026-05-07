import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/chapters/[id]/sections
// Returns all sections for a chapter with the current user's progress
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chapterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, subjects!inner(user_id)')
    .eq('id', chapterId)
    .single();
  if (!chapter || (chapter.subjects as unknown as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

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
    ...s,
    mini_quiz_json: undefined, // never send answers to client from this route
    has_mini_quiz: s.mini_quiz_json !== null,
    progress: progressMap.get(s.id) ?? null,
  }));

  return NextResponse.json({ data: sections });
}
