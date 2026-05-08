import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code.toUpperCase().trim() : null;
  if (!code) return NextResponse.json({ ok: false }, { status: 400 });

  const admin = createAdminClient();
  await admin.from('referral_clicks').insert({
    referral_code: code,
    user_agent: request.headers.get('user-agent'),
  });

  return NextResponse.json({ ok: true });
}
