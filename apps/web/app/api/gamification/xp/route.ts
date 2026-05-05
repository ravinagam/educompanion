import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { awardXp, XP_REWARDS, type XpEvent } from '@/lib/gamification';

// Client-side events that can be posted here
const ALLOWED_CLIENT_EVENTS: XpEvent[] = ['video_watched', 'chat_message'];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from('user_gamification')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json({ data: data ?? null });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { event } = await request.json() as { event: XpEvent };

  if (!ALLOWED_CLIENT_EVENTS.includes(event)) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
  }

  const xp = XP_REWARDS[event];
  const award = await awardXp(user.id, xp);
  return NextResponse.json({ data: award.row, xp_awarded: award.xp_awarded, xp_multiplier: award.multiplier });
}
