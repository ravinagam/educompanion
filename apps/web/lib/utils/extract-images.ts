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

  // Disable web worker — not available in Node.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  // Try to load @napi-rs/canvas for page rendering (vector-graphic fallback)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let canvasFactory: any | undefined;
  try {
    const { createCanvas } = await import('@napi-rs/canvas');
    canvasFactory = {
      create(w: number, h: number) {
        const c = createCanvas(w, h);
        return { canvas: c, context: c.getContext('2d') };
      },
      reset() {},
      destroy() {},
    };
    console.log('[extract-images] @napi-rs/canvas loaded successfully');
  } catch (err) {
    console.log('[extract-images] @napi-rs/canvas not available:', err instanceof Error ? err.message : err);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docOptions: Record<string, any> = {
    data: new Uint8Array(buffer),
    disableFontFace: true,
  };
  if (canvasFactory) docOptions.canvasFactory = canvasFactory;

  const doc = await pdfjsLib.getDocument(docOptions).promise;
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
  // This handles PDFs where figures are vector graphics rather than embedded XObjects
  // (common in NCERT and other textbook PDFs).
  if (results.length === 0) {
    console.log('[extract-images] No raster XObjects — trying page rendering for vector figures');

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
      // Attempt A: sharp native PDF rendering (works when libvips has poppler support)
      let rendered = false;
      try {
        const rawPng = await sharp(buffer, { page: pageNum - 1, density: 150 })
          .png({ compressionLevel: 6 })
          .toBuffer();
        const trimmed = await sharp(rawPng)
          .trim({ background: '#ffffff', threshold: 10 })
          .png({ compressionLevel: 6 })
          .toBuffer();
        const meta = await sharp(trimmed).metadata();
        const w = meta.width ?? 0;
        const h = meta.height ?? 0;
        if (w >= MIN_DIM && h >= MIN_DIM) {
          results.push({ data: trimmed, width: w, height: h, pageNum, orderIdx: globalIdx++ });
          console.log('[extract-images] sharp rendered page', pageNum, `(${w}x${h})`);
          rendered = true;
        }
      } catch (err) {
        console.log('[extract-images] sharp PDF render failed for page', pageNum, ':', err instanceof Error ? err.message : err);
      }

      // Attempt B: pdfjs + @napi-rs/canvas
      if (!rendered && canvasFactory) {
        try {
          const page = await doc.getPage(pageNum);
          const SCALE = 1.5;
          const viewport = page.getViewport({ scale: SCALE });
          const w = Math.round(viewport.width);
          const h = Math.round(viewport.height);

          const { canvas, context } = canvasFactory.create(w, h) as {
            canvas: { toBuffer(fmt: string): Buffer };
            context: unknown;
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await page.render({ canvas: canvas as any, canvasContext: context as any, viewport }).promise;

          const rawPng = canvas.toBuffer('image/png');
          const trimmed = await sharp(rawPng).trim({ background: '#ffffff', threshold: 5 }).png({ compressionLevel: 6 }).toBuffer();
          const meta = await sharp(trimmed).metadata();

          results.push({
            data: trimmed,
            width: meta.width ?? w,
            height: meta.height ?? h,
            pageNum,
            orderIdx: globalIdx++,
          });
          console.log('[extract-images] canvas rendered page', pageNum);
          page.cleanup();
        } catch (err) {
          console.warn('[extract-images] canvas render failed for page', pageNum, ':', err instanceof Error ? err.message : err);
        }
      }
    }
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
