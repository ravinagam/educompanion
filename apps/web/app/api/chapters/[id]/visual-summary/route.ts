import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateVisualSummary } from '@/lib/ai/visual-summary';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chapterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: chapter } = await admin
    .from('chapters')
    .select('id, name, content_text, upload_status, subjects!inner(user_id)')
    .eq('id', chapterId)
    .single();

  if (!chapter || (chapter.subjects as unknown as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (chapter.upload_status !== 'ready') {
    return NextResponse.json({ error: 'Chapter is not ready yet' }, { status: 400 });
  }

  try {
    const summary = await generateVisualSummary(user.id, chapter.name, chapter.content_text);
    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[visual-summary]', e);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
  }
}
