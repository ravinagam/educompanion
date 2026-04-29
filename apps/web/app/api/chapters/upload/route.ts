import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processChapterAsync, MIME_FROM_EXT } from '@/lib/chapters/process';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const chapterId = formData.get('chapterId') as string | null;
    const chapterName = formData.get('chapterName') as string | null;
    const subjectId = formData.get('subjectId') as string | null;

    if (!file || !chapterName || !subjectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (file.size > 52_428_800) {
      return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify subject belongs to user
    const { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subjectId)
      .eq('user_id', user.id)
      .single();

    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

    // Upload file to Supabase Storage
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const storagePath = `${user.id}/${subjectId}/${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: storageError } = await admin.storage
      .from('chapter-files')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (storageError) throw new Error(`Storage error: ${storageError.message}`);

    const { data: { publicUrl } } = admin.storage
      .from('chapter-files')
      .getPublicUrl(storagePath);

    // Create or update chapter record
    let chapter;
    if (chapterId) {
      const { data } = await admin
        .from('chapters')
        .update({ upload_status: 'processing', file_url: publicUrl, file_name: file.name, file_size_bytes: file.size })
        .eq('id', chapterId)
        .select()
        .single();
      chapter = data;
    } else {
      const { data } = await admin
        .from('chapters')
        .insert({
          subject_id: subjectId,
          name: chapterName,
          upload_status: 'processing',
          file_url: publicUrl,
          file_name: file.name,
          file_size_bytes: file.size,
        })
        .select()
        .single();
      chapter = data;
    }

    if (!chapter) throw new Error('Failed to create chapter record');

    // Use after() so Next.js guarantees this runs after the response is sent,
    // even across hot-reloads in dev. void+IIFE is not reliable in Next.js 15+.
    const capturedId = chapter.id as string;
    const capturedMime = MIME_FROM_EXT[ext] ?? file.type;
    const capturedName = file.name;
    after(async () => {
      const bgAdmin = createAdminClient();
      try {
        console.log('[upload] Starting background processing for chapter', capturedId);
        await processChapterAsync(capturedId, buffer, capturedMime, capturedName, user.id);
        console.log('[upload] Processing complete for chapter', capturedId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Processing failed';
        console.error('[upload] Chapter processing failed:', capturedId, message);
        await bgAdmin.from('chapters').update({
          upload_status: 'error',
          error_message: message,
        }).eq('id', capturedId);
      }
    });

    return NextResponse.json({ data: chapter });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
