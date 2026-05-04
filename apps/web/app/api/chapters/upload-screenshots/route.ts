import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ocrScreenshots } from '@/lib/chapters/ocr-screenshots';
import { processTextContent } from '@/lib/chapters/process';

// OCR 30 pages × ~5s each + embedding = up to ~3 min; give headroom
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

  // Create chapter record immediately so it appears in the list
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

    // Download all screenshots concurrently
    const images = await Promise.all(
      storagePaths.map(async (path) => {
        const { data: blob, error } = await admin.storage.from('chapter-files').download(path);
        if (error || !blob) throw new Error(`Failed to download page: ${path}`);
        return { buffer: Buffer.from(await blob.arrayBuffer()), storagePath: path };
      })
    );

    // OCR all pages via Claude Haiku Vision (concurrent)
    const contentText = await ocrScreenshots(images, user.id);
    console.log('[screenshots] OCR complete —', contentText.length, 'chars extracted');

    // Chunk → embed → save content_text → mark ready
    await processTextContent(admin, chapterId, contentText, user.id);
    console.log('[screenshots] Chapter', chapterId, 'is ready');

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
