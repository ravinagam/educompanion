import Anthropic from '@anthropic-ai/sdk';
import type { NextRequest } from 'next/server';
import { assessTextQuality } from './text-quality';

const MAX_TEXT_CHARS = 120_000; // ~80 pages — enough for any school chapter

async function extractPdfTextFallback(buffer: Buffer): Promise<string> {
  // pdf-parse v1 — plain text extraction, no math rendering
  const { default: pdfParse } = await import('pdf-parse');
  let result: { text: string };
  try {
    result = await pdfParse(buffer);
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    if (msg.includes('password') || msg.includes('encrypt')) {
      throw new Error('This PDF is password-protected. Please remove the password and re-upload.');
    }
    throw new Error('Could not read this PDF — it may be corrupted or in an unsupported format. Try re-exporting it from the original application.');
  }
  if (!result.text?.trim()) {
    throw new Error('This PDF contains no selectable text. It is likely a scanned image PDF — try uploading the pages as photos instead using the "Upload as Photos" option.');
  }
  return result.text;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  // OPTIMIZATION 1: Try pdf-parse first (free) — most PDFs are plain text
  let pdfParseText: string | null = null;
  let isKrutiDev = false;

  try {
    const { default: pdfParse } = await import('pdf-parse');
    const parsed = await pdfParse(buffer);
    pdfParseText = parsed.text ?? null;

    if (pdfParseText) {
      const { isKrutiDevEncoded } = await import('@/lib/utils/pdf-vision-extract');
      isKrutiDev = isKrutiDevEncoded(pdfParseText);

      // Assess quality of pdf-parse text
      const quality = assessTextQuality(pdfParseText);

      if (quality.isHighQuality) {
        console.log('[text-extraction] PDF extracted successfully with pdf-parse (FREE) — quality metrics:', {
          length: quality.metrics.length,
          readableCharRatio: (quality.metrics.readableCharRatio * 100).toFixed(0) + '%',
          avgWordLen: quality.metrics.avgWordLength.toFixed(1)
        });
        return pdfParseText;
      }

      console.log('[text-extraction] pdf-parse text quality insufficient:', quality.reason);
    }
  } catch (err) {
    console.warn('[text-extraction] pdf-parse failed:', err instanceof Error ? err.message : err);
  }

  // FALLBACK: Use Claude Vision for high-quality extraction (when pdf-parse fails/insufficient)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const { extractTextFromPdfVision } = await import('@/lib/utils/pdf-vision-extract');
      const claude = new Anthropic({ apiKey });

      console.log('[text-extraction] Using Claude Vision (PAID) — pdf-parse was insufficient', {
        hadText: !!pdfParseText,
        isKrutiDev
      });

      const result = await extractTextFromPdfVision(buffer, claude, isKrutiDev);
      if (result.text.trim().length > 1000) {
        console.log('[text-extraction] Vision extraction succeeded:', result.input_tokens, 'in /', result.output_tokens, 'out tokens');
        return result.text;
      }
      console.warn('[text-extraction] Vision extraction returned too little text:', result.text.trim().length, 'chars — falling back to pdf-parse');
    } catch (err) {
      console.warn('[text-extraction] Vision extraction failed:', err instanceof Error ? err.message : err);
    }
  }

  return extractPdfTextFallback(buffer);
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  let text: string;

  if (mimeType === 'text/plain') {
    text = buffer.toString('utf-8');
    if (!text.trim()) throw new Error('This text file appears to be empty.');
  } else if (mimeType === 'application/pdf') {
    text = await extractPdfText(buffer);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    if (!result.value.trim()) throw new Error('This Word document appears to be empty or contains no readable text.');
    text = result.value;
  } else if (mimeType.startsWith('image/')) {
    throw new Error('Images cannot be processed as documents. Use the "Upload as Photos" option to let AI read your page images.');
  } else {
    throw new Error('File type not supported. Please upload a PDF, Word document (.docx/.doc), or text file (.txt).');
  }

  return text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
}

export async function parseFormDataFile(request: NextRequest): Promise<{
  buffer: Buffer;
  mimeType: string;
  filename: string;
  size: number;
}> {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) throw new Error('No file provided');
  if (file.size > 52_428_800) throw new Error('File too large (max 50 MB)');

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    mimeType: file.type,
    filename: file.name,
    size: file.size,
  };
}
