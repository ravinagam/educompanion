import { describe, it, expect } from 'vitest';
import { parseJSON, sampleContent } from '@/lib/ai/utils';

describe('parseJSON', () => {
  it('parses plain JSON array', () => {
    const result = parseJSON<number[]>('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('parses plain JSON object', () => {
    const result = parseJSON<{ term: string }>('{"term": "Newton"}');
    expect(result).toEqual({ term: 'Newton' });
  });

  it('strips ```json ... ``` code fences', () => {
    const text = '```json\n[{"term":"test"}]\n```';
    const result = parseJSON<{ term: string }[]>(text);
    expect(result).toEqual([{ term: 'test' }]);
  });

  it('strips ``` ... ``` code fences without language tag', () => {
    const text = '```\n{"key": "value"}\n```';
    const result = parseJSON<{ key: string }>(text);
    expect(result).toEqual({ key: 'value' });
  });

  it('handles leading/trailing whitespace around JSON', () => {
    const result = parseJSON<string[]>('  ["a", "b"]  ');
    expect(result).toEqual(['a', 'b']);
  });

  it('throws a descriptive error for invalid JSON', () => {
    expect(() => parseJSON('{broken json')).toThrow('AI returned an unexpected response');
  });

  it('throws for empty string', () => {
    expect(() => parseJSON('')).toThrow();
  });

  it('throws for plain text (no JSON)', () => {
    expect(() => parseJSON('Sorry, I cannot answer that.')).toThrow();
  });
});

describe('sampleContent', () => {
  it('returns text unchanged when shorter than maxChars', () => {
    const text = 'Short chapter content';
    expect(sampleContent(text, 1000)).toBe(text);
  });

  it('returns text unchanged when exactly maxChars', () => {
    const text = 'a'.repeat(100);
    expect(sampleContent(text, 100)).toBe(text);
  });

  it('returns empty string for empty input', () => {
    expect(sampleContent('', 100)).toBe('');
  });

  it('samples long content into start + middle + end sections', () => {
    const text = 'a'.repeat(10_000);
    const result = sampleContent(text, 300);
    expect(result).toContain('[... middle of chapter ...]');
    expect(result).toContain('[... later in chapter ...]');
  });

  it('sampled output is approximately maxChars + separator overhead', () => {
    const text = 'x'.repeat(90_000);
    const maxChars = 300;
    const result = sampleContent(text, maxChars);
    // Each third ≈ 100 chars + two separator strings (~60 chars each)
    expect(result.length).toBeGreaterThan(maxChars);
    expect(result.length).toBeLessThan(maxChars + 200); // separators are ~120 chars total
  });

  it('output contains content from start of text', () => {
    const text = 'START' + 'x'.repeat(10_000) + 'END';
    const result = sampleContent(text, 300);
    expect(result.startsWith('START')).toBe(true);
  });

  it('output contains content from end of text', () => {
    const text = 'x'.repeat(10_000) + 'END';
    const result = sampleContent(text, 300);
    expect(result).toContain('END');
  });
});
