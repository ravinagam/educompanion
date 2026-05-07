import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

  const admin = createAdminClient();
  const { data } = await admin
    .from('users')
    .select('name')
    .eq('referral_code', code.toUpperCase())
    .single();

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Return only the first name for privacy
  const firstName = data.name.split(' ')[0];
  return NextResponse.json({ name: firstName });
}
