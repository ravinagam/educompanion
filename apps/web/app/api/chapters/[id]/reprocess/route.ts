import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processChapterAsync, MIME_FROM_EXT } from '@/lib/chapters/process';
import { splitChapterIntoSections } from '@/lib/ai/sections';
import { logAiUsage } from '@/lib/ai/usage';

export const maxDuration = 300;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, file_url, file_name, upload_status, subject:subjects!inner(user_id)')
    .eq('id', id)
    .single();

  if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
  if (!chapter.file_url) return NextResponse.json({ error: 'No file associated with chapter' }, { status: 400 });

  const admin = createAdminClient();

  // Extract storage path from public URL
  const url = new URL(chapter.file_url);
  const storagePath = url.pathname.split('/object/public/chapter-files/')[1];
  if (!storagePath) return NextResponse.json({ error: 'Cannot resolve storage path' }, { status: 400 });

  // Download file from storage BEFORE sending response (admin client bypasses RLS)
  const { data: fileData, error: downloadError } = await admin.storage
    .from('chapter-files')
    .download(storagePath);

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: 'Failed to download file: ' + (downloadError?.message ?? 'unknown') },
      { status: 500 }
    );
  }

  const filename = chapter.file_name ?? storagePath.split('/').pop() ?? 'file';
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = MIME_FROM_EXT[ext] ?? 'application/octet-stream';
  const buffer = Buffer.from(await fileData.arrayBuffer());

  // Mark as processing before returning
  await admin.from('chapters').update({
    upload_status: 'processing',
    error_message: null,
  }).eq('id', id);

  // after() guarantees this runs to completion after the response is sent
  after(async () => {
    const bgAdmin = createAdminClient();
    try {
      console.log('[reprocess] Starting for chapter', id, filename, mimeType);
      await processChapterAsync(id, buffer, mimeType, filename, user.id);
      console.log('[reprocess] Complete for chapter', id);

      // Split chapter into sections (non-fatal)
      try {
        const { data: ch } = await bgAdmin.from('chapters').select('name, content_text').eq('id', id).single();
        if (ch?.content_text) {
          await bgAdmin.from('chapter_sections').delete().eq('chapter_id', id);
          const sectionsResult = await splitChapterIntoSections(ch.name, ch.content_text);
          if (sectionsResult.data.length > 0) {
            await bgAdmin.from('chapter_sections').insert(
              sectionsResult.data.map(s => ({
                chapter_id: id,
                title: s.title,
                content_text: s.content_text,
                order_index: s.order_index,
                estimated_minutes: s.estimated_minutes,
              }))
            );
            logAiUsage(user.id, 'section_split', sectionsResult.model, sectionsResult.input_tokens, sectionsResult.output_tokens).catch(console.error);
            console.log('[reprocess] Sections generated:', sectionsResult.data.length, 'for chapter', id);
          }
        }
      } catch (secErr) {
        console.warn('[reprocess] Section splitting skipped:', secErr instanceof Error ? secErr.message : secErr);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Processing failed';
      console.error('[reprocess] Failed for chapter', id, ':', message);
      await bgAdmin.from('chapters').update({
        upload_status: 'error',
        error_message: message,
      }).eq('id', id);
    }
  });

  return NextResponse.json({ success: true });
}
