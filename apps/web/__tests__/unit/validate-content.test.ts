import { describe, it, expect } from 'vitest';
import { validateContent } from '@/lib/chapters/process';

describe('validateContent', () => {
  it('passes for a normal readable chapter text', () => {
    const text = 'This is a sentence with real educational content. '.repeat(10);
    expect(() => validateContent(text)).not.toThrow();
  });

  it('throws when trimmed text is under 300 chars', () => {
    const text = 'Short text. '.repeat(5); // ~60 chars
    expect(() => validateContent(text)).toThrow(/could not read enough text/i);
  });

  it('throws when fewer than 50 words even if char count is satisfied', () => {
    // 25 words × 13 chars each = 325 chars (> 300) but only 25 words
    const text = 'verylongword '.repeat(25).trim();
    expect(() => validateContent(text)).toThrow(/too few words/i);
  });

  it('throws for garbled text with low readable-char ratio', () => {
    // 80 repetitions of '☎☏☐☑☒ ' → 480 chars, 80 words, but only 80 spaces are readable
    // readable ratio = 80/480 ≈ 16.7% < 45%
    const garbled = '☎☏☐☑☒ '.repeat(80);
    expect(() => validateContent(garbled)).toThrow(/could not be read clearly/i);
  });

  it('throws for text with words jammed together (avg word length > 25)', () => {
    // 60 words, each 26 chars long → avg = ~27 > 25
    const text = ('a'.repeat(26) + ' ').repeat(60).trim();
    expect(() => validateContent(text)).toThrow(/garbled with words joined/i);
  });

  it('passes text that is exactly at the minimum thresholds', () => {
    // 55 × 'hello ' = 330 chars, 55 words, 100% readable, avg word len = 5
    const text = 'hello '.repeat(55).trim();
    expect(() => validateContent(text)).not.toThrow();
  });

  it('passes for a pure Devanagari (Hindi) chapter', () => {
    // Devanagari chars are NOT in [a-zA-Z0-9] — the old ASCII-only check would wrongly
    // reject valid Hindi text extracted from a PDF. Unicode \p{L} must be used instead.
    const hindiWord = 'मीराबाई का जन्म जोधपुर के चोकड़ी गाँव में हुआ था। ';
    const text = hindiWord.repeat(15); // well over 300 chars, 50+ words
    expect(() => validateContent(text)).not.toThrow();
  });

  it('passes for mixed Hindi-English text', () => {
    const text = ('मीराबाई की भक्ति poetry is studied in Class 10 Hindi. ').repeat(12);
    expect(() => validateContent(text)).not.toThrow();
  });
});
