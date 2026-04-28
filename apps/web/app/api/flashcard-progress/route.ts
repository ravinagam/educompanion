import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SRS_INTERVALS_HOURS } from '@educompanion/shared';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { flashcardId, status } = await request.json();
  // status: 'known' | 'unknown'

  if (!flashcardId || !['known', 'unknown'].includes(status)) {
    return NextResponse.json({ error: 'flashcardId and valid status required' }, { status: 400 });
  }

  // Get current progress to compute review interval
  const { data: existing } = await supabase
    .from('flashcard_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('flashcard_id', flashcardId)
    .single();

  const reviewCount = existing ? existing.review_count + 1 : 1;
  const intervalHours = status === 'known'
    ? (SRS_INTERVALS_HOURS[Math.min(reviewCount, 5)] ?? 720)
    : SRS_INTERVALS_HOURS[0]; // Reset to 1 hour if unknown

  const nextReviewAt = new Date(Date.now() + intervalHours * 3600000).toISOString();

  const { data, error } = await supabase
    .from('flashcard_progress')
    .upsert({
      user_id: user.id,
      flashcard_id: flashcardId,
      status,
      next_review_at: nextReviewAt,
      review_count: reviewCount,
    }, { onConflict: 'user_id,flashcard_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
