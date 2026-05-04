import Anthropic from '@anthropic-ai/sdk';
import { logAiUsage } from '@/lib/ai/usage';

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

const EXT_TO_MEDIA_TYPE: Record<string, ImageMediaType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export async function ocrScreenshots(
  images: Array<{ buffer: Buffer; storagePath: string }>,
  userId: string
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log(`[ocr] Processing ${images.length} pages concurrently`);

  // All pages in parallel — turns 15×4s sequential into ~4s total
  const results = await Promise.allSettled(
    images.map(async ({ buffer, storagePath }, i) => {
      const ext = storagePath.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mediaType: ImageMediaType = EXT_TO_MEDIA_TYPE[ext] ?? 'image/jpeg';
      const base64 = buffer.toString('base64');

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            {
              type: 'text',
              text: 'Extract all text from this textbook page screenshot exactly as it appears. Preserve headings, bullet points, numbered lists, tables, and equations. Output plain text only — no commentary, no markdown formatting.',
            },
          ],
        }],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
      console.log(`[ocr] Page ${i + 1} done — ${text.length} chars`);
      return { text, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
    })
  );

  let totalInput = 0;
  let totalOutput = 0;

  const pages = results.map((result, i) => {
    if (result.status === 'fulfilled') {
      totalInput += result.value.inputTokens;
      totalOutput += result.value.outputTokens;
      return result.value.text;
    }
    console.warn(`[ocr] Page ${i + 1} failed:`, result.reason instanceof Error ? result.reason.message : result.reason);
    return `[Page ${i + 1}: OCR failed]`;
  });

  console.log(`[ocr] Complete — ${totalInput} input + ${totalOutput} output tokens`);
  logAiUsage(userId, 'ocr-screenshots', 'claude-haiku-4-5-20251001', totalInput, totalOutput).catch(console.error);

  return pages.map((text, i) => `--- Page ${i + 1} ---\n\n${text}`).join('\n\n\n');
}
