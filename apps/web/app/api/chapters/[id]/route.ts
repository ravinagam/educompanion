import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify chapter belongs to the user (via subject ownership)
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, file_url, subject:subjects!inner(user_id)')
    .eq('id', id)
    .single();

  if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });

  const admin = createAdminClient();

  // Delete from storage if a file exists
  if (chapter.file_url) {
    const url = new URL(chapter.file_url);
    const storagePath = url.pathname.split('/object/public/chapter-files/')[1];
    if (storagePath) {
      await admin.storage.from('chapter-files').remove([storagePath]);
    }
  }

  // Delete chapter row (cascades to embeddings, quizzes, flashcards via FK)
  await admin.from('chapters').delete().eq('id', id);

  return NextResponse.json({ success: true });
}
