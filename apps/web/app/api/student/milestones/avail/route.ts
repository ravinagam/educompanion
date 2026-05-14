import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { xp_milestone } = await request.json() as { xp_milestone: number };
  if (!xp_milestone) return NextResponse.json({ error: 'Missing xp_milestone' }, { status: 400 });

  const admin = createAdminClient();

  // Only mark as availed if voucher_code is already set and not yet availed
  const { data: row } = await admin
    .from('user_gift_milestones')
    .select('voucher_code, availed_at')
    .eq('user_id', user.id)
    .eq('xp_milestone', xp_milestone)
    .single();

  if (!row?.voucher_code) {
    return NextResponse.json({ error: 'No voucher available' }, { status: 400 });
  }
  if (row.availed_at) {
    return NextResponse.json({ error: 'Already availed' }, { status: 400 });
  }

  const { error } = await admin
    .from('user_gift_milestones')
    .update({ availed_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('xp_milestone', xp_milestone);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
