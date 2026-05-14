import Anthropic from '@anthropic-ai/sdk';
import { logAiUsage } from '@/lib/ai/usage';
import { compressForApi } from '@/lib/utils/compress-image';

export async function ocrScreenshots(
  images: Array<{ buffer: Buffer; storagePath: string }>,
  userId: string
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log(`[ocr] Processing ${images.length} pages concurrently`);

  // All pages in parallel — turns 15×4s sequential into ~4s total
  const results = await Promise.allSettled(
    images.map(async ({ buffer, storagePath }, i) => {
      const { base64, mediaType } = await compressForApi(buffer, storagePath);

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            {
              type: 'text',
              text: `You are extracting text from a page of an Indian school textbook (CBSE/ICSE/State board).

Extract ALL visible text exactly as it appears. Apply these rules for mathematical content:

1. Inline expressions — wrap in single dollar signs: $x^2 + 3x - 4 = 0$
2. Standalone/display equations — place on their own line with double dollar signs:
   $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
3. Use standard LaTeX inside delimiters:
   - Fractions: \\frac{a}{b}
   - Roots: \\sqrt{x}, \\sqrt[3]{x}
   - Superscripts/subscripts: x^2, x_n
   - Greek: \\alpha, \\beta, \\theta, \\pi
   - Operators: \\leq, \\geq, \\neq, \\times, \\div, \\pm, \\cdot
   - Common functions: \\sin, \\cos, \\tan, \\log, \\lim, \\sum, \\int

4. Preserve all paragraph breaks with a blank line between paragraphs.
5. Preserve section headings as plain text on their own line.
6. Output ONLY the extracted text — no commentary, no markdown fences.`,
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
