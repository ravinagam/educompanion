import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { parseMathSegments, hasMathDelimiters, isKrutiDevEncoded, extractTextFromPdfVision } from '@/lib/utils/pdf-vision-extract';

// ── parseMathSegments ─────────────────────────────────────────────────────────

describe('parseMathSegments', () => {
  it('returns a single text segment for plain text', () => {
    const segs = parseMathSegments('The quick brown fox');
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual({ kind: 'text', content: 'The quick brown fox' });
  });

  it('parses a single inline math segment', () => {
    const segs = parseMathSegments('The value is $x^2$.');
    expect(segs).toHaveLength(3);
    expect(segs[0]).toEqual({ kind: 'text', content: 'The value is ' });
    expect(segs[1]).toEqual({ kind: 'inline-math', content: 'x^2' });
    expect(segs[2]).toEqual({ kind: 'text', content: '.' });
  });

  it('parses a display math segment', () => {
    const segs = parseMathSegments('The formula is:\n$$x = \\frac{-b}{2a}$$\nEnd.');
    const displaySeg = segs.find(s => s.kind === 'display-math');
    expect(displaySeg).toBeDefined();
    expect(displaySeg?.content).toBe('x = \\frac{-b}{2a}');
  });

  it('prefers display math over inline when both delimiters match', () => {
    // $$...$$ should not be parsed as two $...$ inline segments
    const segs = parseMathSegments('$$a + b = c$$');
    expect(segs).toHaveLength(1);
    expect(segs[0].kind).toBe('display-math');
  });

  it('parses multiple inline math segments in one string', () => {
    const segs = parseMathSegments('If $a > 0$ and $b > 0$ then $a + b > 0$.');
    const mathSegs = segs.filter(s => s.kind === 'inline-math');
    expect(mathSegs).toHaveLength(3);
    expect(mathSegs[0].content).toBe('a > 0');
    expect(mathSegs[1].content).toBe('b > 0');
    expect(mathSegs[2].content).toBe('a + b > 0');
  });

  it('returns empty array for empty string', () => {
    expect(parseMathSegments('')).toEqual([]);
  });

  it('handles text with no math delimiters as a single segment', () => {
    const text = 'Polynomials are expressions with variables and coefficients.';
    const segs = parseMathSegments(text);
    expect(segs).toHaveLength(1);
    expect(segs[0].kind).toBe('text');
  });

  it('trims whitespace from math content', () => {
    const segs = parseMathSegments('$  x^2  $');
    const math = segs.find(s => s.kind === 'inline-math');
    expect(math?.content).toBe('x^2');
  });

  it('handles LaTeX fractions correctly', () => {
    const segs = parseMathSegments('The quadratic formula is $\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.');
    const math = segs.find(s => s.kind === 'inline-math');
    expect(math?.content).toContain('frac');
    expect(math?.content).toContain('sqrt');
  });

  it('handles mixed display and inline math', () => {
    const text = 'Consider $x > 0$. Then:\n$$x^2 > 0$$\nThis is always true.';
    const segs = parseMathSegments(text);
    expect(segs.some(s => s.kind === 'inline-math')).toBe(true);
    expect(segs.some(s => s.kind === 'display-math')).toBe(true);
  });

  it('does not split a single dollar sign as math', () => {
    // Lone $ with no closing pair should not produce a math segment
    const segs = parseMathSegments('Price is $100');
    expect(segs.every(s => s.kind === 'text')).toBe(true);
  });
});

// ── hasMathDelimiters ─────────────────────────────────────────────────────────

describe('hasMathDelimiters', () => {
  it('returns true for text with inline math', () => {
    expect(hasMathDelimiters('The value $x^2$ is positive')).toBe(true);
  });

  it('returns true for text with display math', () => {
    expect(hasMathDelimiters('$$\\frac{a}{b}$$')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(hasMathDelimiters('No math here at all')).toBe(false);
  });

  it('returns false for text with lone dollar sign (price)', () => {
    expect(hasMathDelimiters('Price is $100 only')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasMathDelimiters('')).toBe(false);
  });
});

// ── isKrutiDevEncoded ─────────────────────────────────────────────────────────

describe('isKrutiDevEncoded', () => {
  // Actual KrutiDev-encoded sample from the screenshot
  const krutiSample =
    'Li\'kZ ehjk (1503-1546) ehjkckbZ dk tUe tks/iqj osQ pksdM+h xkjo esa 1503 esa gqvk ekuk tkrk gSA ' +
    '13 o"kZ dh mez esa esokM+ osQ egkjk.kk lqjkxj Hkkstjkt ls mudk fookg gqvkA mudk thou nq[kksa dh ' +
    'Nk;k esa gh chrkA ckY;koLFkk esa gh ekj dk nsgkar gks x;kA FkkA fookg osQ ckn gh firk vkSj lkFk ' +
    'us ?kjèkj NksM+k vkSj Ñ".kHkfDr esa yhu gks xbZA';

  it('returns true for KrutiDev-encoded Hindi text', () => {
    expect(isKrutiDevEncoded(krutiSample)).toBe(true);
  });

  it('returns false for proper Unicode Devanagari text', () => {
    const devanagari =
      'मीरा बाई का जन्म 1503 में हुआ था। वे एक महान भक्त कवयित्री थीं जिन्होंने ' +
      'कृष्ण भक्ति में अपना जीवन समर्पित कर दिया। उनकी रचनाएँ आज भी लोकप्रिय हैं।';
    expect(isKrutiDevEncoded(devanagari)).toBe(false);
  });

  it('returns false for plain English text', () => {
    const english =
      'The chapter discusses the life of Meera Bai who was born in 1503 and dedicated her life ' +
      'to the devotion of Krishna. She is considered one of the most important saints of the ' +
      'Bhakti movement and her compositions are still sung today.';
    expect(isKrutiDevEncoded(english)).toBe(false);
  });

  it('returns false for text that is too short', () => {
    expect(isKrutiDevEncoded('dk dh esa gS')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isKrutiDevEncoded('')).toBe(false);
  });

  it('returns false for math-garbled text (geometric symbols)', () => {
    const mathGarble = 'The value of ■ x ◆ is ▲ where the formula ◿ gives ■ result ■ every ◆ time ■ it ◿ runs correctly and produces output ■ values';
    expect(isKrutiDevEncoded(mathGarble)).toBe(false);
  });
});

// ── extractTextFromPdfVision ──────────────────────────────────────────────────

const mockCreate = vi.fn();

function makeMockClaude(): Anthropic {
  return { messages: { create: mockCreate } } as unknown as Anthropic;
}

describe('extractTextFromPdfVision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns extracted text and usage from Claude response', async () => {
    const richText = 'Chapter content with $x^2$ formula. This is educational text. '.repeat(20);
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: richText }],
      usage: { input_tokens: 1500, output_tokens: 200 },
      model: 'claude-sonnet-4-6',
    });

    const result = await extractTextFromPdfVision(Buffer.alloc(100), makeMockClaude());

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(result.text).toBe(richText);
    expect(result.input_tokens).toBe(1500);
    expect(result.output_tokens).toBe(200);
    expect(result.model).toBe('claude-sonnet-4-6');
  });

  it('sends the PDF as a base64 document block', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'extracted text' }],
      usage: { input_tokens: 100, output_tokens: 50 },
      model: 'claude-sonnet-4-6',
    });

    const testBuffer = Buffer.from('fake-pdf-bytes');
    await extractTextFromPdfVision(testBuffer, makeMockClaude());

    const call = mockCreate.mock.calls[0][0];
    const docBlock = call.messages[0].content[0];
    expect(docBlock.type).toBe('document');
    expect(docBlock.source.media_type).toBe('application/pdf');
    expect(docBlock.source.data).toBe(testBuffer.toString('base64'));
  });

  it('throws when PDF exceeds 20 MB size limit', async () => {
    const bigBuffer = Buffer.alloc(21 * 1024 * 1024); // 21 MB

    await expect(extractTextFromPdfVision(bigBuffer, makeMockClaude()))
      .rejects.toThrow(/too large/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns empty text when Claude returns non-text content block', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'image' }],
      usage: { input_tokens: 100, output_tokens: 0 },
      model: 'claude-sonnet-4-6',
    });

    const result = await extractTextFromPdfVision(Buffer.alloc(100), makeMockClaude());
    expect(result.text).toBe('');
  });

  it('uses Sonnet directly for reliable extraction', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'text' }],
      usage: { input_tokens: 100, output_tokens: 50 },
      model: 'claude-sonnet-4-6',
    });

    await extractTextFromPdfVision(Buffer.alloc(100), makeMockClaude());

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const call = mockCreate.mock.calls[0][0];
    expect(call.model).toContain('sonnet');
  });

  it('uses Unicode supplement when isKrutiDev=true is passed by caller', async () => {
    // KrutiDev detection is done by text-extraction.ts (server-only) before calling this.
    // The caller passes isKrutiDev=true so this function adds the Unicode supplement.
    const unicodeText = 'मीराबाई की भक्ति कविता हिंदी साहित्य में महत्वपूर्ण है।';
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: unicodeText }],
      usage: { input_tokens: 2000, output_tokens: 200 },
      model: 'claude-sonnet-4-6',
    });

    const result = await extractTextFromPdfVision(Buffer.alloc(100), makeMockClaude(), true);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(result.model).toBe('claude-sonnet-4-6');
    expect(result.text).toBe(unicodeText);
    // Prompt must include the Unicode supplement
    const promptBlock = mockCreate.mock.calls[0][0].messages[0].content[1];
    expect(promptBlock.text).toContain('UNICODE OUTPUT REQUIRED');
  });

  it('includes math extraction instructions in the prompt', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'text' }],
      usage: { input_tokens: 100, output_tokens: 50 },
      model: 'claude-sonnet-4-6',
    });

    await extractTextFromPdfVision(Buffer.alloc(100), makeMockClaude());

    const call = mockCreate.mock.calls[0][0];
    const textBlock = call.messages[0].content[1];
    expect(textBlock.type).toBe('text');
    expect(textBlock.text).toContain('LaTeX');
    expect(textBlock.text).toContain('\\frac');
  });
});
