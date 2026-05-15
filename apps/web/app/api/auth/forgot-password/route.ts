import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function usernameToEmail(username: string) {
  return `${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}@students.educompanion.app`;
}

export async function POST(req: NextRequest) {
  const { username } = await req.json();
  if (!username?.trim()) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const email = usernameToEmail(username.trim());
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easestudy.in';

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${origin}/auth/reset-password` },
  });

  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ error: 'No account found for this username' }, { status: 404 });
  }

  return NextResponse.json({ link: data.properties.action_link });
}
