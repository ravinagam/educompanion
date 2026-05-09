import type { NextRequest } from 'next/server';

const MAX_TEXT_CHARS = 120_000; // ~80 pages — enough for any school chapter

async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdf-parse v1 — pure Node.js compatible, no browser APIs required
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
