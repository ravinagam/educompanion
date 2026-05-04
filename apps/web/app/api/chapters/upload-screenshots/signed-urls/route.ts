import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { subjectId, files } = await request.json() as {
    subjectId: string;
    files: Array<{ name: string; index: number }>;
  };

  if (!subjectId || !files?.length) {
    return NextResponse.json({ error: 'subjectId and files required' }, { status: 400 });
  }
  if (files.length > 30) {
    return NextResponse.json({ error: 'Maximum 30 screenshots per chapter' }, { status: 400 });
  }

  const { data: subject } = await supabase
    .from('subjects').select('id').eq('id', subjectId).eq('user_id', user.id).single();
  if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

  const admin = createAdminClient();
  const timestamp = Date.now();
  const urls: Array<{ signedUrl: string; storagePath: string }> = [];

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const storagePath = `${user.id}/${subjectId}/screenshots/${timestamp}_${file.index}.${ext}`;

    const { data, error } = await admin.storage
      .from('chapter-files')
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      return NextResponse.json({ error: `Failed to create URL for page ${file.index + 1}` }, { status: 500 });
    }
    urls.push({ signedUrl: data.signedUrl, storagePath });
  }

  return NextResponse.json({ urls });
}
