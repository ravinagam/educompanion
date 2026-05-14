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

export async function extractImagesFromPdf(buffer: Buffer): Promise<ExtractedImage[]> {
  // The main pdfjs-dist entry requires DOMMatrix (browser API) and crashes in Node.js.
  // The legacy build is the Node.js-compatible variant — confirmed working in v5.
  // serverExternalPackages in next.config.ts tells Turbopack not to bundle this;
  // Node.js resolves it at runtime from node_modules.
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Disable web worker — not available in Node.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), disableFontFace: true }).promise;

  const results: ExtractedImage[] = [];
  let globalIdx = 0;

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
