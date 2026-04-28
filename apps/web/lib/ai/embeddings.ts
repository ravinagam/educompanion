import { CHUNK_SIZE_CHARS, CHUNK_OVERLAP_CHARS } from '@educompanion/shared';

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-multilingual-2'; // 1024-dim, handles English + Hindi

async function voyageEmbed(inputs: string[]): Promise<number[][]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: inputs, model: VOYAGE_MODEL }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Voyage AI embedding failed: ${res.status} ${err}`);
    }

    const json = await res.json();
    return json.data.map((d: { embedding: number[] }) => d.embedding);
  } finally {
    clearTimeout(timeout);
  }
}

export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE_CHARS, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk);
    start += CHUNK_SIZE_CHARS - CHUNK_OVERLAP_CHARS;
  }

  return chunks;
}

export async function embedText(text: string): Promise<number[]> {
  const results = await voyageEmbed([text.slice(0, 32000)]);
  return results[0];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  return voyageEmbed(texts.map(t => t.slice(0, 32000)));
}

export function computeComplexityScore(text: string): number {
  const wordCount = text.split(/\s+/).length;
  const sentenceCount = text.split(/[.!?]+/).filter(Boolean).length;
  const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 20;
  const densityScore = Math.min(avgWordsPerSentence / 30, 1);
  const lengthScore = Math.min(wordCount / 5000, 1);
  return Math.round((densityScore * 0.4 + lengthScore * 0.6) * 9 + 1);
}
