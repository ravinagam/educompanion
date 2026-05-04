import Anthropic from '@anthropic-ai/sdk';
import { logAiUsage } from '@/lib/ai/usage';

// claude-haiku-4-5 pricing (USD per million tokens)
const HAIKU_INPUT_COST_PER_M = 0.8;
const HAIKU_OUTPUT_COST_PER_M = 4.0;

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
  const pages: string[] = [];
  let totalInput = 0;
  let totalOutput = 0;

  for (let i = 0; i < images.length; i++) {
    const { buffer, storagePath } = images[i];
    const ext = storagePath.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mediaType: ImageMediaType = EXT_TO_MEDIA_TYPE[ext] ?? 'image/jpeg';
    const base64 = buffer.toString('base64');

    console.log(`[ocr] Processing page ${i + 1}/${images.length} (${storagePath})`);
    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: 'Extract all text from this textbook page screenshot exactly as it appears. Preserve headings, bullet points, numbered lists, tables, and equations. Output plain text only — no commentary, no markdown formatting.',
            },
          ],
        }],
      });

      totalInput += response.usage.input_tokens;
      totalOutput += response.usage.output_tokens;

      const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
      pages.push(text);
      console.log(`[ocr] Page ${i + 1} extracted ${text.length} chars`);
    } catch (err) {
      console.warn(`[ocr] Page ${i + 1} failed:`, err instanceof Error ? err.message : err);
      pages.push(`[Page ${i + 1}: OCR failed]`);
    }
  }

  // Log cost for all pages
  const costUsd = (totalInput * HAIKU_INPUT_COST_PER_M + totalOutput * HAIKU_OUTPUT_COST_PER_M) / 1_000_000;
  logAiUsage(userId, 'ocr-screenshots', 'claude-haiku-4-5-20251001', totalInput, totalOutput).catch(console.error);
  console.log(`[ocr] Total: ${totalInput} input + ${totalOutput} output tokens, $${costUsd.toFixed(4)}`);

  return pages.map((text, i) => `--- Page ${i + 1} ---\n\n${text}`).join('\n\n\n');
}
