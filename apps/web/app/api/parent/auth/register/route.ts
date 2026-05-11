import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { phoneToParentEmail, normalizePhone } from '@/lib/parent-auth';

export async function POST(request: Request) {
  const { phone, password } = await request.json();
  if (!phone || !password) {
    return NextResponse.json({ error: 'Phone and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const digits = normalizePhone(phone);
  if (digits.length < 10) {
    return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check if a student with this phone number exists
  const { data: students } = await admin
    .from('users')
    .select('id')
    .or(`phone_number.eq.${phone},phone_number.eq.${digits},phone_number.eq.+91${digits},phone_number.eq.0${digits}`)
    .limit(1);

  if (!students || students.length === 0) {
    return NextResponse.json(
      { error: 'No student found with this phone number. Ask your child to add this number in their profile.' },
      { status: 404 }
    );
  }

  const email = phoneToParentEmail(digits);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'parent', phone: digits },
  });

  if (error) {
    if (error.message.includes('already been registered') || error.code === 'email_exists') {
      return NextResponse.json({ error: 'An account with this phone already exists. Please sign in.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, userId: data.user.id });
}
