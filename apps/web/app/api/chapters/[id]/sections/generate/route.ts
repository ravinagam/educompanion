import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { splitChapterIntoSections } from '@/lib/ai/sections';
import { logAiUsage } from '@/lib/ai/usage';

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chapterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership via RLS
  const { data: ownership } = await supabase
    .from('chapters')
    .select('id, subjects!inner(user_id)')
    .eq('id', chapterId)
    .single();

  if (!ownership || (ownership.subjects as unknown as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Fetch chapter content via admin client (bypasses RLS on content_text)
  const admin = createAdminClient();
  const { data: chapter } = await admin
    .from('chapters')
    .select('name, content_text')
    .eq('id', chapterId)
    .single();

  if (!chapter?.content_text) {
    return NextResponse.json(
      { error: 'Chapter has no processed content yet. Please reprocess it first.' },
      { status: 400 }
    );
  }

  const capturedId = chapterId;
  const capturedUserId = user.id;
  const capturedName = chapter.name as string;
  const capturedContent = chapter.content_text as string;

  after(async () => {
    const bgAdmin = createAdminClient();
    try {
      await bgAdmin.from('chapter_sections').delete().eq('chapter_id', capturedId);
      const result = await splitChapterIntoSections(capturedName, capturedContent);
      if (result.data.length > 0) {
        await bgAdmin.from('chapter_sections').insert(
          result.data.map(s => ({
            chapter_id: capturedId,
            title: s.title,
            content_text: s.content_text,
            order_index: s.order_index,
            estimated_minutes: s.estimated_minutes,
          }))
        );
        logAiUsage(capturedUserId, 'section_split', result.model, result.input_tokens, result.output_tokens).catch(console.error);
        console.log('[sections/generate] Generated', result.data.length, 'sections for chapter', capturedId);
      }
    } catch (err) {
      console.error('[sections/generate] Failed:', err instanceof Error ? err.message : err);
    }
  });

  return NextResponse.json({ success: true });
}
