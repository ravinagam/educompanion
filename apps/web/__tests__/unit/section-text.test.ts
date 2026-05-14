import { describe, it, expect } from 'vitest';
import { buildParagraphs, classify, cleanText, normalisePdfText } from '@/lib/utils/section-text';

// ── buildParagraphs ───────────────────────────────────────────────────────────

describe('buildParagraphs', () => {
  it('merges lines that continue a sentence into one paragraph', () => {
    const raw = 'The earth is round\nand orbits the sun.';
    const [p] = buildParagraphs(raw);
    expect(p).toContain('The earth is round');
    expect(p).toContain('and orbits the sun');
    expect(buildParagraphs(raw)).toHaveLength(1);
  });

  it('splits into two paragraphs when a sentence ends and a new one starts with a capital', () => {
    const raw = 'First sentence ends here.\nSecond sentence starts here.';
    const paras = buildParagraphs(raw);
    expect(paras).toHaveLength(2);
    expect(paras[0]).toMatch(/First sentence/);
    expect(paras[1]).toMatch(/Second sentence/);
  });

  it('removes lone page numbers', () => {
    const raw = 'Content before.\n42\nContent after.';
    const paras = buildParagraphs(raw);
    expect(paras.join(' ')).not.toMatch(/\b42\b/);
  });

  it('removes reprint lines like "Reprint 2026-27"', () => {
    const raw = 'Chapter content here.\nReprint 2026-27\nMore content.';
    const joined = buildParagraphs(raw).join(' ');
    expect(joined).not.toMatch(/reprint/i);
  });

  it('handles hyphenated line breaks by joining fragments', () => {
    const raw = 'The photosyn-\nthesis process is important.';
    const [p] = buildParagraphs(raw);
    expect(p).toContain('photosynthesis');
  });

  it('forces a paragraph break on known section headers', () => {
    const raw = 'Some body text ending.\nSummary\nThis summarises the chapter.';
    const paras = buildParagraphs(raw);
    expect(paras).toHaveLength(3);
    expect(paras[1]).toBe('Summary');
  });

  it('returns empty array for empty input', () => {
    expect(buildParagraphs('')).toEqual([]);
  });

  it('filters out single-char paragraphs', () => {
    const raw = 'A\nReal paragraph content here.\nB';
    const paras = buildParagraphs(raw);
    expect(paras.every(p => p.length > 1)).toBe(true);
  });
});

// ── cleanText ─────────────────────────────────────────────────────────────────

describe('cleanText', () => {
  it('fixes OCR-split single-capital words like "T he" → "The"', () => {
    expect(cleanText('T he quick brown fox')).toBe('The quick brown fox');
  });

  it('fixes OCR-split single-capital words like "H istory" → "History"', () => {
    expect(cleanText('H istory of India')).toBe('History of India');
  });

  it('does not modify words that are already correctly spaced', () => {
    expect(cleanText('Europe is a continent')).toBe('Europe is a continent');
  });

  it('removes space before punctuation', () => {
    expect(cleanText('Hello , world .')).toBe('Hello, world.');
  });

  it('collapses multiple spaces', () => {
    expect(cleanText('too   many   spaces')).toBe('too many spaces');
  });
});

// ── classify ─────────────────────────────────────────────────────────────────

describe('classify', () => {
  it('classifies "Summary" as a heading', () => {
    expect(classify('Summary')).toMatchObject({ kind: 'heading' });
  });

  it('classifies "Activities" as a heading', () => {
    expect(classify('Activities')).toMatchObject({ kind: 'heading' });
  });

  it('classifies an all-caps short line as a heading', () => {
    expect(classify('CHAPTER ONE')).toMatchObject({ kind: 'heading' });
  });

  it('classifies a figure caption line as caption', () => {
    expect(classify('Fig. 3 — The water cycle diagram')).toMatchObject({ kind: 'caption' });
    expect(classify('See Fig.1 for reference')).toMatchObject({ kind: 'caption' });
  });

  it('classifies a term–definition line as definition', () => {
    const result = classify('Photosynthesis — The process by which plants convert sunlight into food');
    expect(result.kind).toBe('definition');
    if (result.kind === 'definition') {
      expect(result.term).toBe('Photosynthesis');
      expect(result.def).toContain('sunlight');
    }
  });

  it('classifies a multi-word term–definition as definition', () => {
    const result = classify('Solar Energy — Energy derived from the radiation of the sun');
    expect(result.kind).toBe('definition');
    if (result.kind === 'definition') {
      expect(result.term).toBe('Solar Energy');
    }
  });

  it('classifies a regular sentence as body', () => {
    expect(classify('The earth revolves around the sun.')).toMatchObject({ kind: 'body' });
  });

  it('does not classify a short definition (def < 10 chars) as definition', () => {
    // Short def part should fall through to body
    const result = classify('Term — Short');
    expect(result.kind).toBe('body');
  });
});

// ── normalisePdfText ──────────────────────────────────────────────────────────

describe('normalisePdfText', () => {
  it('returns Para[] from raw PDF text', () => {
    const raw = 'Chapter overview here.\nSummary\nKey point one.\nKey point two.';
    const paras = normalisePdfText(raw);
    expect(paras.length).toBeGreaterThan(0);
    expect(paras.some(p => p.kind === 'heading')).toBe(true);
  });

  it('returns body paragraphs for plain prose', () => {
    const raw = 'Photosynthesis is the process.\nPlants use sunlight to make food.';
    const paras = normalisePdfText(raw);
    expect(paras.every(p => p.kind === 'body')).toBe(true);
  });

  it('handles empty input without throwing', () => {
    expect(() => normalisePdfText('')).not.toThrow();
    expect(normalisePdfText('')).toEqual([]);
  });
});
