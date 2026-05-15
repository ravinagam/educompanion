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
  } catch {
    // @napi-rs/canvas not available — page rendering fallback disabled
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docOptions: Record<string, any> = {
    data: new Uint8Array(buffer),
    disableFontFace: true,
  };
  if (canvasFactory) docOptions.canvasFactory = canvasFactory;

  const doc = await pdfjsLib.getDocument(docOptions).promise;

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

  // Pass 2 (fallback) — if no raster images found, render pages that have figure captions.
  // This handles PDFs where figures are vector graphics rather than embedded XObjects
  // (common in NCERT and other textbook PDFs).
  if (results.length === 0 && canvasFactory) {
    console.log('[extract-images] No raster XObjects found — trying page rendering for vector figures');

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      try {
        const textContent = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasFigure = (textContent.items as any[]).some(
          item => 'str' in item && FIGURE_TEXT_RE.test(item.str)
        );

        if (!hasFigure) { page.cleanup(); continue; }

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
        // Trim white margins so the image focuses on the figure area
        const png = await sharp(rawPng).trim({ background: '#ffffff', threshold: 5 }).png({ compressionLevel: 6 }).toBuffer();
        const meta = await sharp(png).metadata();

        results.push({
          data: png,
          width: meta.width ?? w,
          height: meta.height ?? h,
          pageNum,
          orderIdx: globalIdx++,
        });
        console.log('[extract-images] Rendered page', pageNum, 'as figure image');
      } catch (err) {
        console.warn('[extract-images] Page', pageNum, 'render failed:', err instanceof Error ? err.message : err);
      }
      page.cleanup();
    }
  }

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
