import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function usernameToEmail(username: string) {
  return `${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}@students.educompanion.app`;
}

function generateTempPassword() {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Ease${digits}`;
}

export async function POST(req: NextRequest) {
  const { username } = await req.json();
  if (!username?.trim()) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const email = usernameToEmail(username.trim());

  // generateLink verifies the account exists and returns the user ID
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
  });

  if (linkError || !linkData?.user?.id) {
    return NextResponse.json({ error: 'No account found for this username' }, { status: 404 });
  }

  const tempPassword = generateTempPassword();
  const { error: updateError } = await admin.auth.admin.updateUserById(linkData.user.id, {
    password: tempPassword,
  });

  if (updateError) {
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }

  return NextResponse.json({ tempPassword });
}
