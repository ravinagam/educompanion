import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { phoneToParentEmail } from '@/lib/parent-auth';

function generateTempPassword() {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Ease${digits}`;
}

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone?.trim()) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const digits = phone.replace(/\D/g, '');
  const email = phoneToParentEmail(digits);

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
  });

  if (linkError || !linkData?.user?.id) {
    return NextResponse.json({ error: 'No parent account found for this phone number' }, { status: 404 });
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
