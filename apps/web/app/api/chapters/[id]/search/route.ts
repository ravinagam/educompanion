import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { embedText } from '@/lib/ai/embeddings';

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, aVal, i) => sum + aVal * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chapterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { question } = await request.json();
  if (!question || typeof question !== 'string') {
    return NextResponse.json({ error: 'question required' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    // Verify user owns this chapter
    const { data: chapter } = await admin
      .from('chapters')
      .select('id, subjects!inner(user_id)')
      .eq('id', chapterId)
      .single();

    if (!chapter || (chapter.subjects as unknown as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Convert question to embedding
    const questionVector = await embedText(question);

    // Fetch all embeddings for this chapter
    const { data: allEmbeddings, error } = await admin
      .from('chapter_embeddings')
      .select('chunk_text, chunk_index, embedding_vector')
      .eq('chapter_id', chapterId)
      .order('chunk_index');

    if (error || !allEmbeddings?.length) {
      console.error('[search] fetch embeddings error:', error);
      return NextResponse.json({ chunks: [] });
    }

    // Calculate cosine similarity and sort
    const chunksWithSimilarity = allEmbeddings.map((item: any) => {
      const vector = JSON.parse(item.embedding_vector);
      const similarity = cosineSimilarity(questionVector, vector);
      return {
        chunk_text: item.chunk_text,
        chunk_index: item.chunk_index,
        similarity,
      };
    });

    const topChunks = chunksWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(({ chunk_text, chunk_index }) => ({ chunk_text, chunk_index }));

    return NextResponse.json({ chunks: topChunks });
  } catch (e) {
    console.error('[search] Error:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
