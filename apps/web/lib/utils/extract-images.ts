import sharp from 'sharp';

export interface ExtractedImage {
  data: Buffer;   // PNG bytes
  width: number;
  height: number;
  pageNum: number;
  orderIdx: number;
}

// Minimum dimensions to keep — skip tiny icons/decorations
const MIN_DIM = 80;

// Figure caption pattern used to detect pages that contain figures
const FIGURE_TEXT_RE = /\bfig(?:ure)?\.?\s*\d/i;

export async function extractImagesFromPdf(buffer: Buffer): Promise<ExtractedImage[]> {
  // Use mupdf (WebAssembly) — no worker threads, no native deps, works on Vercel.
  // pdfjs-dist was replaced because its worker-thread model fails silently in
  // Vercel's serverless environment, producing 0 images with no error output.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mupdf: any;
  try {
    mupdf = await import('mupdf');
    console.log('[extract-images] mupdf loaded successfully');
  } catch (err) {
    console.warn('[extract-images] mupdf not available:', err instanceof Error ? err.message : err);
    return [];
  }

  let doc: unknown;
  try {
    doc = mupdf.Document.openDocument(new Uint8Array(buffer), 'application/pdf');
  } catch (err) {
    console.warn('[extract-images] mupdf failed to open PDF:', err instanceof Error ? err.message : err);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const numPages = (doc as any).countPages() as number;
  console.log('[extract-images] PDF loaded via mupdf,', numPages, 'pages');

  const results: ExtractedImage[] = [];
  let globalIdx = 0;

  // Pass 1 — find pages containing figure captions using mupdf text extraction.
  // mupdf runs entirely in-process (WASM), so text extraction is synchronous and reliable.
  const figurePages: number[] = [];
  for (let i = 0; i < numPages; i++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page = (doc as any).loadPage(i);
      const pageText: string = page.toStructuredText('preserve-whitespace').asText();
      if (FIGURE_TEXT_RE.test(pageText)) {
        figurePages.push(i + 1); // store as 1-indexed pageNum
        console.log('[extract-images] Page', i + 1, 'has figure — sample:', pageText.replace(/\n/g, ' ').slice(0, 120));
      }
    } catch (err) {
      console.log('[extract-images] Page', i + 1, 'text extraction failed:', err instanceof Error ? err.message : err);
    }
  }
  console.log('[extract-images] Pages with figure captions:', figurePages);

  if (figurePages.length === 0) {
    console.log('[extract-images] No figure pages detected — no images to extract');
    return [];
  }

  // Pass 2 — render each figure page to a PNG using mupdf.
  for (const pageNum of figurePages) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page = (doc as any).loadPage(pageNum - 1); // mupdf is 0-indexed
      const scale = 1.5;
      const ctm = mupdf.Matrix.scale(scale, scale);
      const pixmap = page.toPixmap(ctm, mupdf.ColorSpace.DeviceRGB, false);
      const rawPng = Buffer.from(pixmap.asPNG() as Uint8Array);

      // Trim white margins so the stored image is tightly cropped
      const trimmed = await sharp(rawPng)
        .trim({ background: '#ffffff', threshold: 10 })
        .png({ compressionLevel: 6 })
        .toBuffer();
      const meta = await sharp(trimmed).metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;

      if (w >= MIN_DIM && h >= MIN_DIM) {
        results.push({ data: trimmed, width: w, height: h, pageNum, orderIdx: globalIdx++ });
        console.log('[extract-images] Rendered page', pageNum, `(${w}x${h})`);
      } else {
        console.log('[extract-images] Page', pageNum, 'trimmed too small (', w, 'x', h, '), skipping');
      }
    } catch (err) {
      console.warn('[extract-images] Page', pageNum, 'render failed:', err instanceof Error ? err.stack ?? err.message : err);
    }
  }

  console.log('[extract-images] Final image count:', results.length);
  return results;
}
