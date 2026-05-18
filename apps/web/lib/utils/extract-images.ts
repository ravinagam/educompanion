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
  // The main pdfjs-dist entry requires DOMMatrix (browser API) and crashes in Node.js.
  // The legacy build is the Node.js-compatible variant — confirmed working in v5.
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // pdfjs-dist v5 requires a real workerSrc path; empty string no longer works.
  // Use pathToFileURL (not manual file:// concat) for correct encoding on Linux.
  try {
    const { createRequire } = await import('module');
    const { pathToFileURL } = await import('url');
    const req = createRequire(import.meta.url);
    const workerPath = req.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();
    console.log('[extract-images] pdfjs workerSrc set to', pdfjsLib.GlobalWorkerOptions.workerSrc);
  } catch (err) {
    console.log('[extract-images] workerSrc setup failed:', err instanceof Error ? err.message : err);
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  }

  // Try to load @napi-rs/canvas for page rendering (vector-graphic fallback)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let createCanvas: ((w: number, h: number) => any) | undefined;
  try {
    const mod = await import('@napi-rs/canvas');
    createCanvas = (w, h) => mod.createCanvas(w, h);
    console.log('[extract-images] @napi-rs/canvas loaded successfully');
  } catch (err) {
    console.log('[extract-images] @napi-rs/canvas not available:', err instanceof Error ? err.message : err);
  }

  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
  }).promise;
  console.log('[extract-images] PDF loaded,', doc.numPages, 'pages');

  const results: ExtractedImage[] = [];
  let globalIdx = 0;

  // Pass 1 — extract raster image XObjects
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const ops = await page.getOperatorList();

    // Collect unique image XObject names on this page
    const imageNames: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
        const name: string = ops.argsArray[i][0];
        if (!seen.has(name)) { seen.add(name); imageNames.push(name); }
      }
    }

    for (const name of imageNames) {
      const img = await getImageObj(page, name);
      if (!img || img.width < MIN_DIM || img.height < MIN_DIM) continue;

      try {
        const png = await toPng(img);
        results.push({ data: png, width: img.width, height: img.height, pageNum, orderIdx: globalIdx++ });
      } catch {
        // Skip images that can't be converted
      }
    }

    page.cleanup();
  }

  console.log('[extract-images] Pass 1 found', results.length, 'raster XObject images');

  // Pass 2 (fallback) — if no raster images found, render pages that have figure captions.
  // Uses pdfjs + @napi-rs/canvas (the only reliable renderer in Vercel's Node environment).
  // NOTE: sharp does NOT support PDF rendering in its prebuilt binaries (no poppler),
  // so we skip that approach entirely.
  if (results.length === 0 && createCanvas) {
    console.log('[extract-images] No raster XObjects — scanning for figure pages');

    // Collect pages that contain figure captions
    const figurePages: number[] = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      try {
        const textContent = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasFigure = (textContent.items as any[]).some(
          item => 'str' in item && FIGURE_TEXT_RE.test(item.str)
        );
        if (hasFigure) figurePages.push(pageNum);
      } catch {
        // ignore
      }
      page.cleanup();
    }
    console.log('[extract-images] Pages with figure captions:', figurePages);

    for (const pageNum of figurePages) {
      try {
        const page = await doc.getPage(pageNum);
        const SCALE = 1.5;
        const viewport = page.getViewport({ scale: SCALE });
        const w = Math.round(viewport.width);
        const h = Math.round(viewport.height);

        const canvas = createCanvas(w, h);
        const context = canvas.getContext('2d');

        // pdfjs v5 RenderParameters requires both canvas and canvasContext
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.render({ canvas: canvas as any, canvasContext: context as any, viewport }).promise;

        const rawPng: Buffer = canvas.toBuffer('image/png');
        const trimmed = await sharp(rawPng)
          .trim({ background: '#ffffff', threshold: 10 })
          .png({ compressionLevel: 6 })
          .toBuffer();
        const meta = await sharp(trimmed).metadata();
        const imgW = meta.width ?? w;
        const imgH = meta.height ?? h;

        if (imgW >= MIN_DIM && imgH >= MIN_DIM) {
          results.push({ data: trimmed, width: imgW, height: imgH, pageNum, orderIdx: globalIdx++ });
          console.log('[extract-images] Rendered page', pageNum, `(${imgW}x${imgH})`);
        } else {
          console.log('[extract-images] Page', pageNum, 'trimmed too small, skipping');
        }
        page.cleanup();
      } catch (err) {
        console.warn('[extract-images] Page', pageNum, 'render failed:', err instanceof Error ? err.message : err);
      }
    }
  } else if (results.length === 0) {
    console.log('[extract-images] No raster XObjects and @napi-rs/canvas not available — cannot render vector pages');
  }

  console.log('[extract-images] Final image count:', results.length);
  return results;
}

interface RawImage {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
  kind?: number; // 1=GRAYSCALE_1BPP, 2=RGB_24BPP, 3=RGBA_32BPP
}

function getImageObj(page: unknown, name: string): Promise<RawImage | null> {
  return new Promise((resolve) => {
    // pdfjs page.objs.get fires callback when the object is ready
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (page as any).objs.get(name, (img: RawImage | null) => resolve(img ?? null));
  });
}

async function toPng(img: RawImage): Promise<Buffer> {
  const { data, width, height, kind } = img;
  // Normalise to a plain Buffer regardless of typed array subclass
  const raw: Buffer = Buffer.isBuffer(data)
    ? data
    : Buffer.from(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength);

  // kind 2 = RGB, kind 3 = RGBA; default assume RGBA if unknown
  const channels = kind === 2 ? 3 : kind === 1 ? 1 : 4;

  return sharp(raw, { raw: { width, height, channels } })
    .png({ compressionLevel: 6 })
    .toBuffer();
}
