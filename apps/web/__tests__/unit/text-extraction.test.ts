import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractTextFromBuffer } from '@/lib/utils/text-extraction';

// Mock dynamic imports used by extractTextFromBuffer
vi.mock('pdf-parse', () => ({ default: vi.fn() }));
vi.mock('mammoth', () => ({ extractRawText: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
});

// ── Plain text ────────────────────────────────────────────────────────────────

describe('extractTextFromBuffer — plain text', () => {
  it('returns text for a valid TXT buffer', async () => {
    const buf = Buffer.from('Hello world, this is chapter one content.');
    const result = await extractTextFromBuffer(buf, 'text/plain', 'chapter.txt');
    expect(result).toBe('Hello world, this is chapter one content.');
  });

  it('throws for an empty TXT buffer', async () => {
    const buf = Buffer.from('   ');
    await expect(extractTextFromBuffer(buf, 'text/plain', 'empty.txt'))
      .rejects.toThrow(/empty/i);
  });

  it('truncates TXT files over 120 000 chars', async () => {
    const buf = Buffer.from('a'.repeat(200_000));
    const result = await extractTextFromBuffer(buf, 'text/plain', 'large.txt');
    expect(result.length).toBe(120_000);
  });

  it('returns text unchanged when it is exactly at the cap', async () => {
    const buf = Buffer.from('b'.repeat(120_000));
    const result = await extractTextFromBuffer(buf, 'text/plain', 'cap.txt');
    expect(result.length).toBe(120_000);
  });
});

// ── Image files ───────────────────────────────────────────────────────────────

describe('extractTextFromBuffer — image files', () => {
  it('throws for image/png with a message directing to Photos mode', async () => {
    await expect(extractTextFromBuffer(Buffer.from('png'), 'image/png', 'page.png'))
      .rejects.toThrow(/Upload as Photos/i);
  });

  it('throws for image/jpeg', async () => {
    await expect(extractTextFromBuffer(Buffer.from('jpg'), 'image/jpeg', 'page.jpg'))
      .rejects.toThrow(/Upload as Photos/i);
  });

  it('throws for image/webp', async () => {
    await expect(extractTextFromBuffer(Buffer.from('webp'), 'image/webp', 'page.webp'))
      .rejects.toThrow(/Upload as Photos/i);
  });
});

// ── Unsupported type ──────────────────────────────────────────────────────────

describe('extractTextFromBuffer — unsupported mime type', () => {
  it('throws a "not supported" error for application/zip', async () => {
    await expect(extractTextFromBuffer(Buffer.from('zip'), 'application/zip', 'archive.zip'))
      .rejects.toThrow(/not supported/i);
  });

  it('throws for video/mp4', async () => {
    await expect(extractTextFromBuffer(Buffer.from('mp4'), 'video/mp4', 'video.mp4'))
      .rejects.toThrow(/not supported/i);
  });
});

// ── PDF paths ─────────────────────────────────────────────────────────────────

describe('extractTextFromBuffer — PDF', () => {
  it('returns extracted PDF text', async () => {
    const { default: pdfParse } = await import('pdf-parse');
    vi.mocked(pdfParse).mockResolvedValue({ text: 'Chapter content from PDF' } as never);

    const result = await extractTextFromBuffer(Buffer.from('pdf-bytes'), 'application/pdf', 'ch.pdf');
    expect(result).toBe('Chapter content from PDF');
  });

  it('throws a password error for an encrypted PDF', async () => {
    const { default: pdfParse } = await import('pdf-parse');
    vi.mocked(pdfParse).mockRejectedValue(new Error('password protected document'));

    await expect(extractTextFromBuffer(Buffer.from('enc'), 'application/pdf', 'locked.pdf'))
      .rejects.toThrow(/password-protected/i);
  });

  it('throws a scanned-PDF error when extracted text is empty', async () => {
    const { default: pdfParse } = await import('pdf-parse');
    vi.mocked(pdfParse).mockResolvedValue({ text: '   ' } as never);

    await expect(extractTextFromBuffer(Buffer.from('scan'), 'application/pdf', 'scanned.pdf'))
      .rejects.toThrow(/scanned image PDF/i);
  });

  it('throws a generic error for a corrupted PDF', async () => {
    const { default: pdfParse } = await import('pdf-parse');
    vi.mocked(pdfParse).mockRejectedValue(new Error('unexpected token in stream'));

    await expect(extractTextFromBuffer(Buffer.from('bad'), 'application/pdf', 'corrupt.pdf'))
      .rejects.toThrow(/corrupted/i);
  });
});

// ── DOCX paths ────────────────────────────────────────────────────────────────

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('extractTextFromBuffer — DOCX', () => {
  it('returns extracted DOCX text', async () => {
    const mammoth = await import('mammoth');
    vi.mocked(mammoth.extractRawText).mockResolvedValue({ value: 'Word document content', messages: [] });

    const result = await extractTextFromBuffer(Buffer.from('docx'), DOCX_MIME, 'ch.docx');
    expect(result).toBe('Word document content');
  });

  it('throws for an empty DOCX', async () => {
    const mammoth = await import('mammoth');
    vi.mocked(mammoth.extractRawText).mockResolvedValue({ value: '   ', messages: [] });

    await expect(extractTextFromBuffer(Buffer.from('empty-docx'), DOCX_MIME, 'empty.docx'))
      .rejects.toThrow(/empty|no readable text/i);
  });
});
