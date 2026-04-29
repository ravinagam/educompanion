import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { chatWithChapter } from '@/lib/ai/claude';
import { logAiUsage } from '@/lib/ai/usage';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chapterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { messages } = await request.json();
  if (!messages?.length) return NextResponse.json({ error: 'messages required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: chapter } = await admin
    .from('chapters')
    .select('id, name, content_text, subjects!inner(user_id)')
    .eq('id', chapterId)
    .single();

  if (!chapter || (chapter.subjects as unknown as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const result = await chatWithChapter(chapter.name, chapter.content_text, messages);
    logAiUsage(user.id, 'chat', result.model, result.input_tokens, result.output_tokens).catch(console.error);
    return NextResponse.json({ reply: result.data });
  } catch (e) {
    console.error('[chat]', e);
    return NextResponse.json({ error: 'AI error' }, { status: 500 });
  }
}
