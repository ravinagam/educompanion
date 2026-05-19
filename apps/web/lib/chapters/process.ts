import { createAdminClient } from '@/lib/supabase/admin';
import { extractTextFromBuffer } from '@/lib/utils/text-extraction';
import { chunkText, embedBatch, computeComplexityScore } from '@/lib/ai/embeddings';
import { logCostDirect, VOYAGE_COST_PER_M } from '@/lib/ai/usage';

const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes hard cap

// Throws a user-visible error message when extracted text is too short, too sparse,
// or looks garbled (e.g. scanned PDF that partially extracted, words jammed together).
export function validateContent(text: string): void {
  const trimmed = text.trim();

  if (trimmed.length < 300) {
    throw new Error('This document has too little text to process. Please upload a more complete chapter (at least a few paragraphs).');
  }

  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 50) {
    throw new Error('This document has too few words to create study materials from. Please upload a more detailed document.');
  }

  // Low ratio of readable chars (letters, digits, spaces) suggests garbled extraction
  const readableChars = (trimmed.match(/[a-zA-Z0-9 \n]/g) ?? []).length;
  if (readableChars / trimmed.length < 0.45) {
    throw new Error('Text could not be read clearly from this document — it may be a scanned image PDF without selectable text. Try uploading the pages as photos instead.');
  }

  // Very high average word length means words are jammed together (OCR/export artifact)
  const avgWordLen = trimmed.length / words.length;
  if (avgWordLen > 25) {
    throw new Error('Document text appears garbled with words joined together — this can happen with some exported or scanned PDFs. Try re-exporting or saving the document in a different format.');
  }
}

export async function processChapterAsync(
  chapterId: string,
  buffer: Buffer,
  mimeType: string,
  filename: string,
  userId?: string
) {
  const admin = createAdminClient();

  await Promise.race([
    runProcessing(admin, chapterId, buffer, mimeType, filename, userId),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Processing timed out after 5 minutes')), PROCESSING_TIMEOUT_MS)
    ),
  ]);
}

async function runProcessing(
  admin: ReturnType<typeof createAdminClient>,
  chapterId: string,
  buffer: Buffer,
  mimeType: string,
  filename: string,
  userId?: string
) {
  console.log('[process] Step 1/4 — extracting text from', filename, `(${mimeType})`);
  const contentText = await extractTextFromBuffer(buffer, mimeType, filename);
  console.log('[process] Extracted', contentText.length, 'chars');

  let textWithMarkers = contentText;
  let extractedImages: Array<{ data: Buffer; width: number; height: number; pageNum: number; orderIdx: number }> = [];

  // Extract images so markers can be embedded in text before processTextContent saves it.
  // Storage happens AFTER processTextContent so the chapter is marked ready quickly —
  // uploading 9+ images to Supabase can take 20+ seconds and would exceed Vercel's 60s timeout.
  if (mimeType === 'application/pdf') {
    try {
      const { extractImagesFromPdf } = await import('@/lib/utils/extract-images');
      extractedImages = await extractImagesFromPdf(buffer);
      if (extractedImages.length > 0) {
        textWithMarkers = insertFigureMarkers(contentText, extractedImages);
        console.log('[process] Inserted', (textWithMarkers.match(/\[\[FIGURE:/g) ?? []).length, 'figure markers into text');
      } else {
        console.log('[process] No images extracted from PDF');
      }
    } catch (err) {
      console.warn('[process] Image extraction failed (non-fatal):', err instanceof Error ? err.message : err);
    }
  }

  // Mark chapter ready with markers already embedded in content_text.
  await processTextContent(admin, chapterId, textWithMarkers, userId);

  // Store images after chapter is ready — fire-and-forget so it doesn't block section generation.
  // The section page queries chapter_images at load time, so images will be there by then.
  if (extractedImages.length > 0) {
    extractAndStoreImages(admin, chapterId, extractedImages).catch(err =>
      console.warn('[process] Image storage failed (non-fatal):', err instanceof Error ? err.message : err)
    );
  }
}

// Inserts [[FIGURE:pageNum_orderIdx]] markers before figure caption lines in extracted PDF text.
// Only matches captions at the start of a line (e.g. "Figure 1.1 ..."), not inline references.
// Images are assigned in document order — first caption gets first image, etc.
function insertFigureMarkers(text: string, images: Array<{ pageNum: number; orderIdx: number }>): string {
  if (images.length === 0) return text;
  let imgIdx = 0;
  const seen = new Set<string>();
  return text.replace(
    /((?:^|\n))(Fig(?:ure)?\.?\s+\d+(?:[.\-]\d+)*)/g,
    (fullMatch, lineStart, caption) => {
      const key = caption.toLowerCase().replace(/\s+/g, '');
      if (seen.has(key) || imgIdx >= images.length) return fullMatch;
      seen.add(key);
      const img = images[imgIdx++];
      return `${lineStart}[[FIGURE:${img.pageNum}_${img.orderIdx}]]\n${caption}`;
    }
  );
}

// Shared by both file-upload and screenshot-upload pipelines.
// Receives already-extracted text, runs complexity/chunking/embedding, marks chapter ready.
export async function processTextContent(
  admin: ReturnType<typeof createAdminClient>,
  chapterId: string,
  contentText: string,
  userId?: string
) {
  validateContent(contentText);

  console.log('[process] Computing complexity');
  const complexityScore = computeComplexityScore(contentText);

  console.log('[process] Chunking text');
  const chunks = chunkText(contentText);
  console.log('[process]', chunks.length, 'chunks created');

  if (chunks.length < 2) {
    throw new Error('This document does not have enough structured content to generate learning materials from. Please upload a more complete chapter.');
  };

  await admin.from('chapter_embeddings').delete().eq('chapter_id', chapterId);

  console.log('[process] Generating embeddings');
  try {
    const batchSize = 20;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const vectors = await embedBatch(batch);
      const rows = batch.map((chunk, j) => ({
        chapter_id: chapterId,
        chunk_text: chunk,
        embedding_vector: JSON.stringify(vectors[j]),
        chunk_index: i + j,
      }));
      await admin.from('chapter_embeddings').insert(rows);
      console.log('[process] Embedded batch', Math.floor(i / batchSize) + 1, 'of', Math.ceil(chunks.length / batchSize));
    }
    if (userId) {
      const totalChars = chunks.reduce((sum, c) => sum + c.length, 0);
      const estTokens = Math.round(totalChars / 4);
      const costUsd = (estTokens / 1_000_000) * VOYAGE_COST_PER_M;
      logCostDirect(userId, 'embeddings', 'voyage-multilingual-2', estTokens, costUsd).catch(console.error);
    }
  } catch (embErr) {
    console.warn('[process] Embeddings skipped (chapter still usable):', embErr instanceof Error ? embErr.message : embErr);
  }

  console.log('[process] Saving content_text and marking ready');
  const { error: updateErr } = await admin.from('chapters').update({
    content_text: contentText,
    complexity_score: complexityScore,
    upload_status: 'ready',
    error_message: null,
  }).eq('id', chapterId);

  if (updateErr) throw new Error(`DB update failed: ${updateErr.message}`);
  console.log('[process] Done — chapter', chapterId, 'is ready');
}

async function extractAndStoreImages(
  admin: ReturnType<typeof createAdminClient>,
  chapterId: string,
  images: Array<{ data: Buffer; width: number; height: number; pageNum: number; orderIdx: number }>
) {
  if (images.length === 0) { console.log('[process] No images found in PDF'); return; }
  console.log('[process] Storing', images.length, 'images for chapter', chapterId);

  // Clear previous images for this chapter
  await admin.from('chapter_images').delete().eq('chapter_id', chapterId);

  // Upload all images in parallel (3 at a time) to reduce storage time
  const CONCURRENCY = 3;
  for (let i = 0; i < images.length; i += CONCURRENCY) {
    const batch = images.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (img) => {
      const storagePath = `${chapterId}/${img.pageNum}_${img.orderIdx}.png`;
      const { error: uploadErr } = await admin.storage
        .from('chapter-images')
        .upload(storagePath, img.data, { contentType: 'image/png', upsert: true });

      if (uploadErr) { console.warn('[process] Image upload failed:', uploadErr.message); return; }

      const { data: publicData } = admin.storage.from('chapter-images').getPublicUrl(storagePath);
      await admin.from('chapter_images').insert({
        chapter_id: chapterId,
        image_url: publicData.publicUrl,
        page_num: img.pageNum,
        order_idx: img.orderIdx,
        width: img.width,
        height: img.height,
      });
    }));
  }

  console.log('[process] Stored', images.length, 'images for chapter', chapterId);
}

export const MIME_FROM_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};
