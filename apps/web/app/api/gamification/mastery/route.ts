import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Returns mastered chapter IDs for the current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from('chapter_mastery')
    .select('chapter_id, flashcards_known')
    .eq('user_id', user.id)
    .eq('mastered', true);

  const masteredIds = (data ?? []).map((r: { chapter_id: string }) => r.chapter_id);
  return NextResponse.json({ mastered: masteredIds });
}
