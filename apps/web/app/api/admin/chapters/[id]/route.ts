import { NextRequest, NextResponse } from 'next/server';
import { createAdminSessionClient } from '@/lib/supabase/admin-server';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_EMAIL = 'ravi.nagam.kiran@gmail.com';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createAdminSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: chapter } = await admin
    .from('chapters')
    .select('id, file_url')
    .eq('id', id)
    .single();

  if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });

  // Delete embeddings first (FK constraint)
  await admin.from('chapter_embeddings').delete().eq('chapter_id', id);

  // Delete file from storage if present
  if (chapter.file_url) {
    try {
      const url = new URL(chapter.file_url);
      const storagePath = url.pathname.split('/object/public/chapter-files/')[1];
      if (storagePath) {
        await admin.storage.from('chapter-files').remove([storagePath]);
      }
    } catch {
      // Non-fatal — continue with DB deletion
    }
  }

  const { error } = await admin.from('chapters').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
