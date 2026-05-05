import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ocrScreenshots } from '@/lib/chapters/ocr-screenshots';
import { processTextContent } from '@/lib/chapters/process';
import { generateVideoScriptFromImages, type ImageInput } from '@/lib/ai/claude';
import { compressForApi } from '@/lib/utils/compress-image';
import { logAiUsage } from '@/lib/ai/usage';
import { awardXp, XP_REWARDS } from '@/lib/gamification';

// OCR 30 pages + embedding + video script = up to ~3 min; give headroom
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { subjectId, chapterName, storagePaths } = await request.json() as {
    subjectId: string;
    chapterName: string;
    storagePaths: string[];
  };

  if (!subjectId || !chapterName?.trim() || !storagePaths?.length) {
    return NextResponse.json({ error: 'subjectId, chapterName and storagePaths required' }, { status: 400 });
  }
  if (storagePaths.length > 30) {
    return NextResponse.json({ error: 'Maximum 30 screenshots per chapter' }, { status: 400 });
  }

  const { data: subject } = await supabase
    .from('subjects').select('id').eq('id', subjectId).eq('user_id', user.id).single();
  if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

  const admin = createAdminClient();

  const { data: chapter, error: insertErr } = await admin
    .from('chapters')
    .insert({
      subject_id: subjectId,
      name: chapterName.trim(),
      upload_status: 'processing',
      source_type: 'screenshots',
      screenshot_urls: storagePaths,
    })
    .select()
    .single();

  if (insertErr || !chapter) {
    return NextResponse.json({ error: 'Failed to create chapter' }, { status: 500 });
  }

  const chapterId = chapter.id as string;

  try {
    console.log('[screenshots] Starting OCR for chapter', chapterId, `(${storagePaths.length} pages)`);

    // Download all screenshots concurrently (used for both OCR and video generation)
    const rawImages = await Promise.all(
      storagePaths.map(async (path) => {
        const { data: blob, error } = await admin.storage.from('chapter-files').download(path);
        if (error || !blob) throw new Error(`Failed to download page: ${path}`);
        return { buffer: Buffer.from(await blob.arrayBuffer()), storagePath: path };
      })
    );

    // OCR all pages via Claude Haiku Vision (concurrent)
    const contentText = await ocrScreenshots(rawImages, user.id);
    console.log('[screenshots] OCR complete —', contentText.length, 'chars extracted');

    // Chunk → embed → save content_text → mark ready
    await processTextContent(admin, chapterId, contentText, user.id);
    console.log('[screenshots] Chapter', chapterId, 'is ready');

    // Auto-generate video script using images directly (non-fatal)
    try {
      console.log('[screenshots] Auto-generating video script');
      const apiImages: ImageInput[] = await Promise.all(
        rawImages.map(({ buffer, storagePath }) => compressForApi(buffer, storagePath))
      );
      await admin.from('video_scripts').delete().eq('chapter_id', chapterId);
      await admin.from('video_scripts').insert({ chapter_id: chapterId, script_json: {}, render_status: 'rendering' });
      const videoResult = await generateVideoScriptFromImages(chapterName.trim(), apiImages);
      await admin.from('video_scripts').update({
        script_json: videoResult.data,
        render_status: 'ready',
        error_message: null,
      }).eq('chapter_id', chapterId);
      logAiUsage(user.id, 'video_script_images', videoResult.model, videoResult.input_tokens, videoResult.output_tokens).catch(console.error);
      console.log('[screenshots] Video script ready');
    } catch (videoErr) {
      console.warn('[screenshots] Video auto-generation skipped:', videoErr instanceof Error ? videoErr.message : videoErr);
      await admin.from('video_scripts').update({ render_status: 'error', error_message: 'Auto-generation failed' }).eq('chapter_id', chapterId);
    }

    awardXp(user.id, XP_REWARDS.chapter_uploaded).catch(console.error);
    const { data: readyChapter } = await admin.from('chapters').select().eq('id', chapterId).single();
    return NextResponse.json({ data: readyChapter ?? chapter });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed';
    console.error('[screenshots] Processing failed for chapter', chapterId, ':', message);
    await admin.from('chapters').update({
      upload_status: 'error',
      error_message: message,
    }).eq('id', chapterId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
