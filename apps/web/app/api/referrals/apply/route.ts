import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { awardXp, XP_REWARDS } from '@/lib/gamification';

const REFERRER_XP = 300;
const REFERRED_XP = 100; // welcome bonus for the new user

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { referral_code } = await request.json() as { referral_code?: string };
  if (!referral_code) return NextResponse.json({ error: 'referral_code required' }, { status: 400 });

  const admin = createAdminClient();

  // Find referrer by code
  const { data: referrer } = await admin
    .from('users')
    .select('id')
    .eq('referral_code', referral_code.toUpperCase())
    .single();

  if (!referrer) return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });

  // Prevent self-referral
  if (referrer.id === user.id) {
    return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 });
  }

  // Check if this user has already been referred (UNIQUE constraint on referred_id)
  const { data: existingReferral } = await admin
    .from('referrals')
    .select('id')
    .eq('referred_id', user.id)
    .single();

  if (existingReferral) {
    return NextResponse.json({ error: 'Referral already applied' }, { status: 409 });
  }

  // Record the referral and mark as rewarded immediately (onboarding just completed)
  const { error: insertError } = await admin.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: user.id,
    rewarded_at: new Date().toISOString(),
  });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Store referred_by on the new user's profile
  await admin.from('users').update({ referred_by: referrer.id }).eq('id', user.id);

  // Award XP to both parties (fire and forget individually so one failure doesn't block the other)
  const [referrerAward, referredAward] = await Promise.allSettled([
    awardXp(referrer.id, REFERRER_XP),
    awardXp(user.id, REFERRED_XP),
  ]);

  return NextResponse.json({
    ok: true,
    referrer_xp: referrerAward.status === 'fulfilled' ? referrerAward.value.xp_awarded : 0,
    referred_xp: referredAward.status === 'fulfilled' ? referredAward.value.xp_awarded : 0,
  });
}
