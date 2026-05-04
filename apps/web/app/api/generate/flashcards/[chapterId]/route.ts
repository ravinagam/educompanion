import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateFlashcards, generateFlashcardsFromImages, type ImageInput } from '@/lib/ai/claude';
import { logAiUsage } from '@/lib/ai/usage';
import { compressForApi } from '@/lib/utils/compress-image';

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
    .select('id, name, content_text, upload_status, source_type, screenshot_urls, subjects!inner(user_id)')
    .eq('id', chapterId)
    .single();

  if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
  if ((chapter.subjects as unknown as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (chapter.upload_status !== 'ready') {
    return NextResponse.json({ error: 'Chapter not ready yet' }, { status: 400 });
  }

  const chapterAny = chapter as unknown as { source_type: string; screenshot_urls: string[] | null };
  const isScreenshots = chapterAny.source_type === 'screenshots' && (chapterAny.screenshot_urls?.length ?? 0) > 0;

  if (!isScreenshots) {
    const wordCount = (chapter.content_text ?? '').trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      return NextResponse.json({ error: 'This PDF appears to be scanned (image-based) and contains no extractable text. Please upload a text-based PDF, DOCX, or TXT file.' }, { status: 400 });
    }
  }

  // Check if flashcards already exist — if so, this is a regeneration
  const { data: existingCards } = await supabase
    .from('flashcards')
    .select('id')
    .eq('chapter_id', chapterId)
    .limit(1);

  const variationHint = existingCards?.length
    ? `This is a regeneration (attempt #${Date.now() % 1000}). Generate completely different flashcard terms than before — focus on different concepts.`
    : '';

  let pairs: { term: string; definition: string }[];
  try {
    if (isScreenshots) {
      const admin = createAdminClient();
      const imageData: ImageInput[] = await Promise.all(
        chapterAny.screenshot_urls!.map(async (path) => {
          const { data: blob, error } = await admin.storage.from('chapter-files').download(path);
          if (error || !blob) throw new Error(`Failed to load screenshot: ${path}`);
          return compressForApi(Buffer.from(await blob.arrayBuffer()), path);
        })
      );
      const result = await generateFlashcardsFromImages(chapter.name, imageData, variationHint);
      pairs = result.data;
      logAiUsage(user.id, 'flashcards-images', result.model, result.input_tokens, result.output_tokens).catch(console.error);
    } else {
      const result = await generateFlashcards(chapter.name, chapter.content_text, variationHint);
      pairs = result.data;
      logAiUsage(user.id, 'flashcards', result.model, result.input_tokens, result.output_tokens).catch(console.error);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  const admin = createAdminClient();

  // Delete old flashcards + progress, then insert new
  const { data: oldCards } = await admin
    .from('flashcards')
    .select('id')
    .eq('chapter_id', chapterId);

  if (oldCards?.length) {
    const oldIds = oldCards.map(c => c.id);
    await admin.from('flashcard_progress').delete().in('flashcard_id', oldIds);
    await admin.from('flashcards').delete().in('id', oldIds);
  }

  const rows = pairs.map(p => ({ chapter_id: chapterId, term: p.term, definition: p.definition }));
  const { data: flashcards, error } = await admin
    .from('flashcards')
    .insert(rows)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: flashcards });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  const { chapterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: flashcards } = await supabase
    .from('flashcards')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at');

  const { data: progress } = await supabase
    .from('flashcard_progress')
    .select('*')
    .eq('user_id', user.id)
    .in('flashcard_id', (flashcards ?? []).map(f => f.id));

  const progressMap = new Map((progress ?? []).map(p => [p.flashcard_id, p]));

  const enriched = (flashcards ?? []).map(f => ({
    ...f,
    progress: progressMap.get(f.id) ?? null,
  }));

  return NextResponse.json({ data: enriched });
}
