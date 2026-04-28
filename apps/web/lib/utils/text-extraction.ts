import type { NextRequest } from 'next/server';

const MAX_TEXT_CHARS = 120_000; // ~80 pages — enough for any school chapter

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = (await import('pdf-parse')) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parser: any = null;
  let extracted = '';
  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText({ first: 150 }); // cap at 150 pages
    extracted = result.text ?? '';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`PDF parsing failed: ${msg}`);
  } finally {
    await parser?.destroy().catch(() => {});
  }
  if (!extracted.trim()) {
    throw new Error('PDF appears to be scanned/image-only or encrypted — no text could be extracted');
  }
  return extracted;
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  let text: string;

  if (mimeType === 'text/plain') {
    text = buffer.toString('utf-8');
  } else if (mimeType === 'application/pdf') {
    text = await extractPdfText(buffer);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (mimeType.startsWith('image/')) {
    return `[Image file: ${filename}] - Image content uploaded. AI will reference this visual material.`;
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  // Cap text to prevent excessive chunking for very large files
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
