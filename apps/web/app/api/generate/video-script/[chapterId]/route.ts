import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateVideoScript } from '@/lib/ai/claude';
import { logAiUsage } from '@/lib/ai/usage';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  const { chapterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name, content_text, upload_status, subjects!inner(user_id)')
    .eq('id', chapterId)
    .single();

  if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
  if ((chapter.subjects as unknown as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (chapter.upload_status !== 'ready') {
    return NextResponse.json({ error: 'Chapter not ready yet' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Delete any existing record for this chapter (clean slate ensures single row)
  await admin.from('video_scripts').delete().eq('chapter_id', chapterId);

  // Insert fresh placeholder so page can show "generating" state
  const { data: scriptRecord, error: insertError } = await admin
    .from('video_scripts')
    .insert({ chapter_id: chapterId, script_json: {}, render_status: 'rendering' })
    .select()
    .single();

  if (insertError || !scriptRecord) {
    return NextResponse.json({ error: 'Failed to initialise script record' }, { status: 500 });
  }

  try {
    const result = await generateVideoScript(chapter.name, chapter.content_text ?? '');
    const scriptJson = result.data;
    logAiUsage(user.id, 'video_script', result.model, result.input_tokens, result.output_tokens).catch(console.error);

    await admin.from('video_scripts').update({
      script_json: scriptJson,
      render_status: 'ready',
      error_message: null,
    }).eq('id', scriptRecord.id);

    return NextResponse.json({ data: { ...scriptRecord, script_json: scriptJson, render_status: 'ready' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Script generation failed';
    await admin.from('video_scripts').update({
      render_status: 'error',
      error_message: message,
    }).eq('id', scriptRecord.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  const { chapterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('video_scripts')
    .select('*')
    .eq('chapter_id', chapterId)
    .single();

  return NextResponse.json({ data: data ?? null });
}
