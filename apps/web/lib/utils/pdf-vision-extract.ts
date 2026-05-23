import Anthropic from '@anthropic-ai/sdk';

// Max PDF size Claude can process (~32 MB base64 decoded; we stay well under)
const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB

// Haiku is tried first for cost efficiency; Sonnet is the fallback for image/scanned PDFs
// where Haiku returns too little text (it does not reliably handle the PDF document block type).
const PRIMARY_MODEL = 'claude-haiku-4-5-20251001';
const FALLBACK_MODEL = 'claude-sonnet-4-6';
const VISION_QUALITY_THRESHOLD = 500; // chars below which we retry with the fallback model

// Tokens budgeted per extraction call.
// 8 192 covers ~80 dense textbook pages of output text.
const MAX_OUTPUT_TOKENS = 8192;

const EXTRACTION_PROMPT = `You are extracting text from a multi-page Indian school textbook PDF (CBSE/ICSE/State board).

Extract ALL visible text from EVERY page exactly as it appears — including headings, body text, questions, tables, poem lines, footnotes, and glossary entries. Do NOT summarise or skip any content.

Apply these rules for mathematical content:

1. Inline expressions — wrap in single dollar signs: $x^2 + 3x - 4 = 0$
2. Standalone/display equations — place on their own line with double dollar signs:
   $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
3. Use standard LaTeX inside delimiters:
   - Fractions: \\frac{a}{b}
   - Roots: \\sqrt{x}, \\sqrt[3]{x}
   - Superscripts/subscripts: x^2, x_n
   - Greek: \\alpha, \\beta, \\theta, \\pi
   - Operators: \\leq, \\geq, \\neq, \\times, \\div, \\pm, \\cdot
   - Absolute value: |x|
   - Common functions: \\sin, \\cos, \\tan, \\log, \\lim, \\sum, \\int

4. Preserve all paragraph breaks with a blank line between paragraphs.
5. Preserve section headings as plain text on their own line.
6. Ignore repeated watermarks such as "Downloaded from www.studiestoday.com".
7. Output ONLY the extracted text — no commentary, no markdown fences.`;

export interface VisionExtractionResult {
  text: string;
  input_tokens: number;
  output_tokens: number;
  model: string;
}

export async function extractTextFromPdfVision(
  buffer: Buffer,
  claude: Anthropic,
): Promise<VisionExtractionResult> {
  if (buffer.byteLength > MAX_PDF_BYTES) {
    throw new Error(
      `PDF is too large for vision extraction (${Math.round(buffer.byteLength / 1024 / 1024)} MB > 20 MB limit). ` +
      'Try splitting the chapter into smaller files.'
    );
  }

  const base64Data = buffer.toString('base64');

  const buildRequest = (model: string) => ({
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [
      {
        role: 'user' as const,
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Data,
            },
          } as Anthropic.DocumentBlockParam,
          {
            type: 'text',
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });

  const primary = await claude.messages.create(buildRequest(PRIMARY_MODEL));
  const primaryText = primary.content[0].type === 'text' ? primary.content[0].text : '';

  if (primaryText.trim().length > VISION_QUALITY_THRESHOLD) {
    return {
      text: primaryText,
      input_tokens: primary.usage.input_tokens,
      output_tokens: primary.usage.output_tokens,
      model: primary.model,
    };
  }

  console.warn(
    `[pdf-vision] ${PRIMARY_MODEL} returned only ${primaryText.trim().length} chars — retrying with ${FALLBACK_MODEL}`
  );

  const fallback = await claude.messages.create(buildRequest(FALLBACK_MODEL));
  const fallbackText = fallback.content[0].type === 'text' ? fallback.content[0].text : '';

  return {
    text: fallbackText,
    // Sum tokens from both calls since both were billed
    input_tokens: primary.usage.input_tokens + fallback.usage.input_tokens,
    output_tokens: primary.usage.output_tokens + fallback.usage.output_tokens,
    model: fallback.model,
  };
}

// Parse raw LaTeX-annotated text into segments for rendering.
// Returns alternating plain/math segments so the caller can render them separately.
export type TextSegment =
  | { kind: 'text'; content: string }
  | { kind: 'inline-math'; content: string }   // $...$
  | { kind: 'display-math'; content: string };  // $$...$$

export function parseMathSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  // Match $$...$$ first (longer delimiter), then $...$
  const re = /\$\$([^$]+?)\$\$|\$([^$\n]+?)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', content: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ kind: 'display-math', content: match[1].trim() });
    } else {
      segments.push({ kind: 'inline-math', content: match[2].trim() });
    }
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ kind: 'text', content: text.slice(lastIndex) });
  }

  return segments.filter(s => s.content.length > 0);
}

// Returns true if the string contains a balanced LaTeX math delimiter pair ($...$)
export function hasMathDelimiters(text: string): boolean {
  return /\$\$[^$]+?\$\$|\$[^$\n]+?\$/.test(text);
}
