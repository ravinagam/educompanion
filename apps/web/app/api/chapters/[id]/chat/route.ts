import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { chatWithChapter, chatWithChapterFromImages, storagePathToMediaType, type ImageInput } from '@/lib/ai/claude';
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
    .select('id, name, content_text, source_type, screenshot_urls, subjects!inner(user_id, name)')
    .eq('id', chapterId)
    .single();

  if (!chapter || (chapter.subjects as unknown as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const subjectName = (chapter.subjects as unknown as { name: string }).name;
  const chapterAny = chapter as unknown as { source_type: string; screenshot_urls: string[] | null };
  const isScreenshots = chapterAny.source_type === 'screenshots' && (chapterAny.screenshot_urls?.length ?? 0) > 0;

  try {
    let result;
    if (isScreenshots) {
      const imageData: ImageInput[] = await Promise.all(
        chapterAny.screenshot_urls!.map(async (path) => {
          const { data: blob, error } = await admin.storage.from('chapter-files').download(path);
          if (error || !blob) throw new Error(`Failed to load screenshot: ${path}`);
          return { base64: Buffer.from(await blob.arrayBuffer()).toString('base64'), mediaType: storagePathToMediaType(path) };
        })
      );
      result = await chatWithChapterFromImages(chapter.name, imageData, messages, subjectName);
      logAiUsage(user.id, 'chat-images', result.model, result.input_tokens, result.output_tokens).catch(console.error);
    } else {
      result = await chatWithChapter(chapter.name, chapter.content_text, messages, subjectName);
      logAiUsage(user.id, 'chat', result.model, result.input_tokens, result.output_tokens).catch(console.error);
    }
    return NextResponse.json({ reply: result.data });
  } catch (e) {
    console.error('[chat]', e);
    return NextResponse.json({ error: 'AI error' }, { status: 500 });
  }
}
