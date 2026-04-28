import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateChapterSummary } from '@/lib/ai/claude';

export async function GET(
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
    .select('id, subjects!inner(user_id)')
    .eq('id', chapterId)
    .single();

  if (!chapter || (chapter.subjects as unknown as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: existing } = await admin
    .from('chapter_summaries')
    .select('summary_json')
    .eq('chapter_id', chapterId)
    .single();

  return NextResponse.json({ summary: existing?.summary_json ?? null });
}

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
    .select('id, name, content_text, subjects!inner(user_id)')
    .eq('id', chapterId)
    .single();

  if (!chapter || (chapter.subjects as unknown as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const summary = await generateChapterSummary(chapter.name, chapter.content_text);

    await admin
      .from('chapter_summaries')
      .delete()
      .eq('chapter_id', chapterId);

    await admin
      .from('chapter_summaries')
      .insert({ chapter_id: chapterId, summary_json: summary });

    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[summary]', e);
    return NextResponse.json({ error: 'AI error' }, { status: 500 });
  }
}
