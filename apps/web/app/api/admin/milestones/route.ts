import { NextRequest, NextResponse } from 'next/server';
import { createAdminSessionClient } from '@/lib/supabase/admin-server';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_EMAIL = 'ravi.nagam.kiran@gmail.com';

export async function POST(request: NextRequest) {
  const supabase = await createAdminSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { user_id, xp_milestone, voucher_code } = await request.json() as {
    user_id: string;
    xp_milestone: number;
    voucher_code: string;
  };

  if (!user_id || !xp_milestone || !voucher_code?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('user_gift_milestones')
    .update({
      voucher_code: voucher_code.trim(),
      voucher_sent_at: new Date().toISOString(),
    })
    .eq('user_id', user_id)
    .eq('xp_milestone', xp_milestone);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
