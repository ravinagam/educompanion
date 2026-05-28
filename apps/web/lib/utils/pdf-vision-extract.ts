import Anthropic from '@anthropic-ai/sdk';

// Max PDF size Claude can process (~32 MB base64 decoded; we stay well under)
const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB

// Haiku is tried first for cost efficiency; Sonnet is the fallback for image/scanned PDFs
// where Haiku returns too little text (it does not reliably handle the PDF document block type).
const PRIMARY_MODEL = 'claude-haiku-4-5-20251001';
const FALLBACK_MODEL = 'claude-sonnet-4-6';
// Minimum chars for Haiku's output to be considered acceptable.
// 500 was too low — a partial title extraction (600 chars) would pass but produce < 2 chunks.
// 2000 chars ensures at least one meaningful page of text was extracted before accepting Haiku's output.
const VISION_QUALITY_THRESHOLD = 2000;

// Tokens budgeted per extraction call.
// 16 384 covers ~40–80 dense textbook pages depending on language.
// Devanagari uses ~1.5× more tokens than English, so 8192 was only covering ~10 Hindi pages.
const MAX_OUTPUT_TOKENS = 16384;

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

// Supplemental instruction appended when KrutiDev/ISM legacy Hindi font encoding is detected.
// These PDFs have an embedded text layer of ASCII characters that map to Devanagari via the
// font table. Claude must read the pages visually and output Unicode Devanagari instead.
const EXTRACTION_PROMPT_UNICODE_SUPPLEMENT = `

CRITICAL — UNICODE OUTPUT REQUIRED: This PDF uses a legacy Hindi font encoding (KrutiDev/ISM/Mangal). Its embedded text layer contains garbled ASCII sequences (like "dk", "dh", "esa", "gS") that do NOT represent actual content. Ignore the embedded text layer entirely. Read all text VISUALLY from the rendered page images and output it in proper Unicode Devanagari script (U+0900–U+097F: अ आ इ क ख ग...). Do NOT output ASCII characters that represent Devanagari in legacy fonts.`;

// Detects KrutiDev/ISM legacy Hindi font encoding by counting characteristic
// 2–3 char ASCII sequences that encode common Hindi words.
// "dk"=का  "dh"=की  "esa"=में  "gS"=है  "osQ"=के  etc.
export function isKrutiDevEncoded(text: string): boolean {
  if (!text || text.length < 100) return false;
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length < 20) return false;
  const re = /\b(dk|dh|esa|gS|osQ|ds|dks|Hkh|vkSj|gh|us|gksa|gSa|Fkk|Fkh|gks|rks|ls|rd|tks|lkFk|vkt|ge|vki|oks)\b/g;
  const matches = (text.match(re) ?? []).length;
  return matches / words.length > 0.08;
}

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

  const buildRequest = (model: string, prompt = EXTRACTION_PROMPT) => ({
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
            text: prompt,
          } as Anthropic.TextBlockParam,
        ],
      },
    ],
  });

  const primary = await claude.messages.create(buildRequest(PRIMARY_MODEL));
  const primaryText = primary.content[0].type === 'text' ? primary.content[0].text : '';

  const isGoodQuality = primaryText.trim().length > VISION_QUALITY_THRESHOLD;
  const isKruti = isKrutiDevEncoded(primaryText);

  // Good quality and no encoding issues → done
  if (isGoodQuality && !isKruti) {
    return {
      text: primaryText,
      input_tokens: primary.usage.input_tokens,
      output_tokens: primary.usage.output_tokens,
      model: primary.model,
    };
  }

  const reason = isKruti
    ? 'KrutiDev legacy encoding detected'
    : `only ${primaryText.trim().length} chars`;
  console.warn(`[pdf-vision] ${PRIMARY_MODEL} returned ${reason} — retrying with ${FALLBACK_MODEL}`);

  // Use Unicode-aware prompt for KrutiDev PDFs; standard prompt for low-quality fallback
  const retryPrompt = isKruti
    ? EXTRACTION_PROMPT + EXTRACTION_PROMPT_UNICODE_SUPPLEMENT
    : EXTRACTION_PROMPT;

  const fallback = await claude.messages.create(buildRequest(FALLBACK_MODEL, retryPrompt));
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
