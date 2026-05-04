import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processChapterAsync, MIME_FROM_EXT } from '@/lib/chapters/process';
import { generateVideoScript } from '@/lib/ai/claude';
import { logAiUsage } from '@/lib/ai/usage';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const contentType = request.headers.get('content-type') ?? '';

    let buffer: Buffer = Buffer.alloc(0);
    let fileName: string;
    let fileSize: number;
    let subjectId: string;
    let chapterName: string;
    let chapterId: string | null = null;
    let storagePath: string;
    let mimeType: string;

    if (contentType.includes('application/json')) {
      // Two-step upload: file already in storage via signed URL
      const body = await request.json() as {
        storagePath: string; fileName: string; fileSize: number;
        subjectId: string; chapterName: string; chapterId?: string;
      };
      if (!body.storagePath || !body.fileName || !body.subjectId || !body.chapterName) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      storagePath = body.storagePath;
      fileName = body.fileName;
      fileSize = body.fileSize ?? 0;
      subjectId = body.subjectId;
      chapterName = body.chapterName;
      chapterId = body.chapterId ?? null;

      const { data: subject } = await supabase.from('subjects').select('id')
        .eq('id', subjectId).eq('user_id', user.id).single();
      if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

      const { data: blob, error: downloadErr } = await admin.storage
        .from('chapter-files').download(storagePath);
      if (downloadErr || !blob) throw new Error(`Storage download error: ${downloadErr?.message}`);
      buffer = Buffer.from(await blob.arrayBuffer());

      const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
      mimeType = MIME_FROM_EXT[ext] ?? 'application/octet-stream';
    } else {
      // Direct upload via multipart/form-data (small files ≤ 4.5 MB)
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      chapterId = formData.get('chapterId') as string | null;
      chapterName = (formData.get('chapterName') as string) ?? '';
      subjectId = (formData.get('subjectId') as string) ?? '';

      if (!file || !chapterName || !subjectId) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      if (file.size > 52_428_800) {
        return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 400 });
      }

      const { data: subject } = await supabase.from('subjects').select('id')
        .eq('id', subjectId).eq('user_id', user.id).single();
      if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      storagePath = `${user.id}/${subjectId}/${Date.now()}.${ext}`;
      fileName = file.name;
      fileSize = file.size;
      mimeType = MIME_FROM_EXT[ext] ?? file.type;
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);

      const { error: storageError } = await admin.storage
        .from('chapter-files')
        .upload(storagePath, buffer, { contentType: file.type, upsert: false });
      if (storageError) throw new Error(`Storage error: ${storageError.message}`);
    }

    const { data: { publicUrl } } = admin.storage.from('chapter-files').getPublicUrl(storagePath);

    let chapter;
    if (chapterId) {
      const { data } = await admin.from('chapters')
        .update({ upload_status: 'processing', file_url: publicUrl, file_name: fileName, file_size_bytes: fileSize })
        .eq('id', chapterId).select().single();
      chapter = data;
    } else {
      const { data } = await admin.from('chapters')
        .insert({ subject_id: subjectId, name: chapterName, upload_status: 'processing', file_url: publicUrl, file_name: fileName, file_size_bytes: fileSize })
        .select().single();
      chapter = data;
    }

    if (!chapter) throw new Error('Failed to create chapter record');

    const capturedId = chapter.id as string;
    const capturedBuffer = buffer;
    const capturedMime = mimeType;
    const capturedName = fileName;
    const capturedChapterName = chapterName;
    const capturedUserId = user.id;

    after(async () => {
      const bgAdmin = createAdminClient();
      try {
        console.log('[upload] Starting background processing for chapter', capturedId);
        await processChapterAsync(capturedId, capturedBuffer, capturedMime, capturedName, capturedUserId);
        console.log('[upload] Processing complete for chapter', capturedId);

        // Auto-generate video script (non-fatal)
        try {
          const { data: ch } = await bgAdmin.from('chapters').select('name, content_text').eq('id', capturedId).single();
          if (ch?.content_text) {
            await bgAdmin.from('video_scripts').delete().eq('chapter_id', capturedId);
            await bgAdmin.from('video_scripts').insert({ chapter_id: capturedId, script_json: {}, render_status: 'rendering' });
            const videoResult = await generateVideoScript(capturedChapterName, ch.content_text);
            await bgAdmin.from('video_scripts').update({
              script_json: videoResult.data,
              render_status: 'ready',
              error_message: null,
            }).eq('chapter_id', capturedId);
            logAiUsage(capturedUserId, 'video_script', videoResult.model, videoResult.input_tokens, videoResult.output_tokens).catch(console.error);
            console.log('[upload] Video script auto-generated for chapter', capturedId);
          }
        } catch (videoErr) {
          console.warn('[upload] Video auto-generation skipped:', videoErr instanceof Error ? videoErr.message : videoErr);
        }
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
