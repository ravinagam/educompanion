import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { phoneToParentEmail } from '@/lib/parent-auth';

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone?.trim()) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const digits = phone.replace(/\D/g, '');
  const email = phoneToParentEmail(digits);
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easestudy.in';

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${origin}/auth/reset-password?portal=parent` },
  });

  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ error: 'No parent account found for this phone number' }, { status: 404 });
  }

  return NextResponse.json({ link: data.properties.action_link });
}
