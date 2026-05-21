import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createParentServerClient } from '@/lib/supabase/parent-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateHindiWorksheet } from '@/lib/ai/claude';
import { logAiUsage } from '@/lib/ai/usage';
import { normalizePhone } from '@/lib/parent-auth';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  const { chapterId } = await params;
  const admin = createAdminClient();

  // Accept both student session and parent session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const parentSupabase = await createParentServerClient();
  const { data: { user: parentUser } } = await parentSupabase.auth.getUser();

  if (!user && !parentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: chapter } = await admin
    .from('chapters')
    .select('id, name, content_text, upload_status, subjects!inner(user_id, name)')
    .eq('id', chapterId)
    .single();

  if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
  const subject = chapter.subjects as unknown as { user_id: string; name: string };

  // Student access: direct ownership check
  if (user) {
    if (subject.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else {
    // Parent access: phone must match the student's registered parent phone
    const parentPhone = normalizePhone(parentUser!.user_metadata?.phone ?? '');
    const { data: studentProfile } = await admin
      .from('users')
      .select('phone_number')
      .eq('id', subject.user_id)
      .single();
    if (!studentProfile || normalizePhone(studentProfile.phone_number ?? '') !== parentPhone) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (chapter.upload_status !== 'ready') return NextResponse.json({ error: 'Chapter not ready yet' }, { status: 400 });
  if (!subject.name.toLowerCase().includes('hindi')) {
    return NextResponse.json({ error: 'Worksheet only available for Hindi chapters' }, { status: 400 });
  }

  const actorId = user?.id ?? parentUser!.id;
  try {
    const result = await generateHindiWorksheet(chapter.name, chapter.content_text);
    logAiUsage(actorId, 'hindi-worksheet', result.model, result.input_tokens, result.output_tokens).catch(console.error);
    return NextResponse.json({ questions: result.data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
