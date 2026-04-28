import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { after } from 'next/server';
import { buildStudyPlan, SubjectConfig } from '@/lib/study-plan/generator';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('user_id', user.id)
    .order('test_date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, test_date, chapter_ids, subject_config, plan_start_date } = body as {
    name: string;
    test_date: string;
    chapter_ids: string[];
    subject_config: SubjectConfig[];
    plan_start_date?: string;
  };

  if (!name || !test_date || !chapter_ids?.length) {
    return NextResponse.json(
      { error: 'name, test_date, and chapter_ids are required' },
      { status: 400 }
    );
  }

  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    name,
    test_date,
    chapter_ids,
    subject_config_json: subject_config ?? [],
  };
  if (plan_start_date) insertPayload.plan_start_date = plan_start_date;

  const { data: test, error } = await supabase
    .from('tests')
    .insert(insertPayload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const capturedId = test.id;
  const capturedChapterIds = chapter_ids;
  const capturedTestDate = test_date;
  const capturedConfig: SubjectConfig[] = subject_config ?? [];
  const capturedStartDate = plan_start_date;

  after(async () => {
    try {
      await buildStudyPlan(capturedId, capturedChapterIds, capturedTestDate, capturedConfig, capturedStartDate);
    } catch (err) {
      console.error('[study-plan] generation failed:', err);
    }
  });

  return NextResponse.json({ data: test }, { status: 201 });
}
