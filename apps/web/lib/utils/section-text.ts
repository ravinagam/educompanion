export type Para =
  | { kind: 'body'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'caption'; text: string }
  | { kind: 'definition'; term: string; def: string };

// ─── Watermark / garble cleaning ─────────────────────────────────────────────

// Returns true when a word is a simple self-repetition: "HUMANHUMAN", "DEVELOPMENTDEVELOPMENT"
function isSelfRepeated(word: string): boolean {
  if (word.length < 4) return false;
  for (let len = 2; len <= Math.floor(word.length / 2); len++) {
    if (word.slice(0, len * 2) === word.slice(0, len).repeat(2)) return true;
  }
  return false;
}

// Returns true when a line looks like a diagonal-watermark artefact:
//   – mostly uppercase with self-repeated words (HUMANHUMAN, DEVELOPMENTDEVELOPMENT)
//   – or mostly uppercase with the same word appearing 3+ times
function isWatermarkLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 6) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;

  // Lines with substantial non-ASCII script (Devanagari, Arabic, CJK, etc.) are never watermarks.
  // Without this guard, Devanagari text has upper=0 lower=0, which bypasses the ASCII-only
  // uppercase check below — causing valid Hindi lines (e.g. any line with "काका") to be
  // incorrectly deleted because "काका" passes isSelfRepeated() as a repeated-syllable word.
  const nonAscii = (trimmed.match(/[^\x00-\x7F]/g) ?? []).length;
  if (nonAscii > trimmed.length * 0.2) return false;

  // Must be predominantly uppercase (real headings pass the <30 % lower test too,
  // but they're caught later by SECTION_HEADER_RE / classify, not removed here)
  const upper = (trimmed.match(/[A-Z]/g) ?? []).length;
  const lower = (trimmed.match(/[a-z]/g) ?? []).length;
  if (lower > upper * 0.3) return false; // significant lowercase → keep

  // Any self-repeated word (HUMANHUMAN, REPORREPOR …) is a strong watermark signal
  const selfRep = words.filter(isSelfRepeated).length;
  if (selfRep >= 1) return true;

  // Same word appearing 3+ times also signals a watermark
  const counts = new Map<string, number>();
  words.forEach(w => counts.set(w.toLowerCase(), (counts.get(w.toLowerCase()) ?? 0) + 1));
  const maxCount = Math.max(...counts.values());
  if (maxCount >= 3) return true;

  return false;
}

// Cleans a raw extracted text string:
//   1. Removes watermark-artefact lines
//   2. Adds a space before a bare number/% that's jammed onto a word
//      (e.g. "population76%" → "population 76%", "Category76" → "Category 76")
export function cleanExtractedText(raw: string): string {
  const lines = raw.split('\n');
  const cleaned = lines
    .filter(l => !isWatermarkLine(l))
    .join('\n');
  // Add space before digits/% that are jammed against a letter (table extraction artefact)
  return cleaned.replace(/([a-zA-Z])(\d)/g, '$1 $2');
}

const WORD_SUFFIX_RE = /^(e|ed|er|es|ry|ly|nd|ty|al|ing|ion|ism|ent|ant|ive|ous|ial|tion|ness|ment|ity|ogy|acy|ary|ery|ory)$/;

export const SECTION_HEADER_RE = /^(New [Ww]ords?|Activities|Summary|Keywords?|Key [Tt]erms?|Introduction|Conclusion|Note|Did [Yy]ou [Kk]now|Let\s*'?s [Rr]ecall|Questions?|Exercises?)[:.]?\s*$/;

export function buildParagraphs(raw: string): string[] {
  const lines = cleanExtractedText(raw)
    .replace(/-\n[ \t]*/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .filter(l => !/^\d{1,4}$/.test(l))
    .filter(l => !/\breprint\s+\d{4}[-–]\d{2,4}\b/i.test(l));

  const paragraphs: string[] = [];
  let buffer = '';

  for (const line of lines) {
    if (SECTION_HEADER_RE.test(line)) {
      if (buffer) { paragraphs.push(buffer.replace(/\s+/g, ' ').trim()); buffer = ''; }
      paragraphs.push(line.trim());
      continue;
    }

    if (!buffer) { buffer = line; continue; }

    if (/^[a-z]$/.test(line)) { buffer += line; continue; }

    const lastToken = buffer.split(/\s+/).pop() ?? '';
    if (WORD_SUFFIX_RE.test(line) && lastToken.length >= 2 && lastToken.length <= 8 && /[a-z]$/.test(lastToken)) {
      buffer += line;
      continue;
    }

    if (/^[,;]$/.test(line)) { buffer += line; continue; }

    const prevEndsSentence = /[.!?]\s*$/.test(buffer);
    const lineStartsUpper  = /^[A-Z]/.test(line);

    if (prevEndsSentence && lineStartsUpper) {
      paragraphs.push(buffer.replace(/\s+/g, ' ').trim());
      buffer = line;
    } else {
      buffer += ' ' + line;
    }
  }

  if (buffer) paragraphs.push(buffer.replace(/\s+/g, ' ').trim());
  return paragraphs.filter(p => p.length > 1);
}

export function cleanText(t: string): string {
  return t
    .replace(/\b([B-HJ-Z]) ([a-z]{2,})/g, '$1$2')
    .replace(/(\w) ([,;:.])/g, '$1$2')
    .replace(/  +/g, ' ')
    .trim();
}

// Returns true when raw PDF text contains characters that indicate garbled math:
//   U+25A0-U+25FF  Geometric Shapes (filled/open squares, circles, diamonds)
//                  — pdf-parse maps unknown glyph codes here when the PDF uses
//                    a custom math font (MathType, Symbol, STIX, etc.)
//   U+E000-U+F8FF  Private Use Area — math font characters with no Unicode equivalent
export function hasMathGarble(text: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[■-◿-]/.test(text);
}

export function classify(text: string): Para {
  if (SECTION_HEADER_RE.test(text)) return { kind: 'heading', text };

  if (/^[A-Z][A-Z\s]{4,}$/.test(text) && text.length < 80) return { kind: 'heading', text };

  if (/\bFig\.?\s*\d/.test(text)) return { kind: 'caption', text };

  const defMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s*[–—]\s*(.{10,})$/);
  if (defMatch) return { kind: 'definition', term: defMatch[1].trim(), def: defMatch[2].trim() };

  return { kind: 'body', text };
}

export function normalisePdfText(raw: string): Para[] {
  return buildParagraphs(raw).map(p => classify(cleanText(p)));
}
