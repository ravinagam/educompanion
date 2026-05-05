import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateChapterSummary, generateChapterSummaryFromImages, type ImageInput } from '@/lib/ai/claude';
import { logAiUsage } from '@/lib/ai/usage';
import { compressForApi } from '@/lib/utils/compress-image';
import { awardXp, XP_REWARDS } from '@/lib/gamification';

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
    .select('id, name, content_text, source_type, screenshot_urls, subjects!inner(user_id)')
    .eq('id', chapterId)
    .single();

  if (!chapter || (chapter.subjects as unknown as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const chapterAny = chapter as unknown as { source_type: string; screenshot_urls: string[] | null };
  const isScreenshots = chapterAny.source_type === 'screenshots' && (chapterAny.screenshot_urls?.length ?? 0) > 0;

  try {
    let result;
    if (isScreenshots) {
      const imageData: ImageInput[] = await Promise.all(
        chapterAny.screenshot_urls!.map(async (path) => {
          const { data: blob, error } = await admin.storage.from('chapter-files').download(path);
          if (error || !blob) throw new Error(`Failed to load screenshot: ${path}`);
          return compressForApi(Buffer.from(await blob.arrayBuffer()), path);
        })
      );
      result = await generateChapterSummaryFromImages(chapter.name, imageData);
    } else {
      result = await generateChapterSummary(chapter.name, chapter.content_text);
    }
    const summary = result.data;
    logAiUsage(user.id, 'summary', result.model, result.input_tokens, result.output_tokens).catch(console.error);

    await admin
      .from('chapter_summaries')
      .delete()
      .eq('chapter_id', chapterId);

    await admin
      .from('chapter_summaries')
      .insert({ chapter_id: chapterId, summary_json: summary });

    awardXp(user.id, XP_REWARDS.summary_generated).catch(console.error);
    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[summary]', e);
    return NextResponse.json({ error: 'AI error' }, { status: 500 });
  }
}
