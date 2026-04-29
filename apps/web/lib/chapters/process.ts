import { createAdminClient } from '@/lib/supabase/admin';
import { extractTextFromBuffer } from '@/lib/utils/text-extraction';
import { chunkText, embedBatch, computeComplexityScore } from '@/lib/ai/embeddings';
import { logCostDirect, VOYAGE_COST_PER_M } from '@/lib/ai/usage';

const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes hard cap

export async function processChapterAsync(
  chapterId: string,
  buffer: Buffer,
  mimeType: string,
  filename: string,
  userId?: string
) {
  const admin = createAdminClient();

  // Wrap entire processing in a timeout so it can never hang forever
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

  console.log('[process] Step 2/4 — computing complexity');
  const complexityScore = computeComplexityScore(contentText);

  console.log('[process] Step 3/4 — chunking text');
  const chunks = chunkText(contentText);
  console.log('[process]', chunks.length, 'chunks created');

  await admin.from('chapter_embeddings').delete().eq('chapter_id', chapterId);

  console.log('[process] Step 4/4 — generating embeddings');
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
