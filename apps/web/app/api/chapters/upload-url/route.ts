import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { subjectId, fileName } = await request.json() as { subjectId: string; fileName: string };
  if (!subjectId || !fileName) {
    return NextResponse.json({ error: 'subjectId and fileName required' }, { status: 400 });
  }

  // Verify subject belongs to user
  const { data: subject } = await supabase
    .from('subjects')
    .select('id')
    .eq('id', subjectId)
    .eq('user_id', user.id)
    .single();

  if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const storagePath = `${user.id}/${subjectId}/${Date.now()}.${ext}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from('chapter-files')
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create upload URL' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, storagePath, token: data.token });
}
