import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { chatWithChapter } from '@/lib/ai/claude';
import { logAiUsage } from '@/lib/ai/usage';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { id: chapterId, sectionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify chapter ownership via RLS
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name, subjects!inner(user_id, name)')
    .eq('id', chapterId)
    .single();

  if (!chapter || (chapter.subjects as unknown as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { messages } = await request.json();
  if (!messages?.length) return NextResponse.json({ error: 'messages required' }, { status: 400 });

  // Fetch section content (restricted to this section only)
  const admin = createAdminClient();
  const { data: section } = await admin
    .from('chapter_sections')
    .select('id, title, content_text')
    .eq('id', sectionId)
    .eq('chapter_id', chapterId)
    .single();

  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

  const subjectName = (chapter.subjects as unknown as { name: string }).name;

  try {
    // Pass section content (not full chapter) so AI answers only from this section
    const result = await chatWithChapter(
      `${chapter.name} — ${section.title}`,
      section.content_text,
      messages,
      subjectName,
    );
    logAiUsage(user.id, 'chat-section', result.model, result.input_tokens, result.output_tokens).catch(console.error);
    return NextResponse.json({ reply: result.data });
  } catch (e) {
    console.error('[section-chat]', e);
    return NextResponse.json({ error: 'AI error' }, { status: 500 });
  }
}
