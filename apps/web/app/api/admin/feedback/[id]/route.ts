import { NextRequest, NextResponse } from 'next/server';
import { createAdminSessionClient } from '@/lib/supabase/admin-server';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_EMAIL = 'ravi.nagam.kiran@gmail.com';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createAdminSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { admin_response } = await request.json() as { admin_response: string };
  if (!admin_response?.trim()) {
    return NextResponse.json({ error: 'Response required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('feedback')
    .update({
      admin_response: admin_response.trim(),
      admin_responded_at: new Date().toISOString(),
      status: 'resolved',
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
