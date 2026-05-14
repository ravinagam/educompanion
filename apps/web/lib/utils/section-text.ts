export type Para =
  | { kind: 'body'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'caption'; text: string }
  | { kind: 'definition'; term: string; def: string };

const WORD_SUFFIX_RE = /^(e|ed|er|es|ry|ly|nd|ty|al|ing|ion|ism|ent|ant|ive|ous|ial|tion|ness|ment|ity|ogy|acy|ary|ery|ory)$/;

export const SECTION_HEADER_RE = /^(New [Ww]ords?|Activities|Summary|Keywords?|Key [Tt]erms?|Introduction|Conclusion|Note|Did [Yy]ou [Kk]now|Let\s*'?s [Rr]ecall|Questions?|Exercises?)[:.]?\s*$/;

export function buildParagraphs(raw: string): string[] {
  const lines = raw
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
