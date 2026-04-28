import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildStudyPlan, SubjectConfig } from '@/lib/study-plan/generator';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  const { testId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: test, error: testError } = await supabase
    .from('tests')
    .select('*')
    .eq('id', testId)
    .eq('user_id', user.id)
    .single();

  if (testError || !test) return NextResponse.json({ error: 'Test not found' }, { status: 404 });

  const { data: plans, error: planError } = await supabase
    .from('study_plans')
    .select('*, chapter:chapters(id, name, complexity_score, subjects(id, name))')
    .eq('test_id', testId)
    .order('day_date', { ascending: true });

  if (planError) return NextResponse.json({ error: planError.message }, { status: 500 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(test.test_date);
  const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000);

  return NextResponse.json({ data: { test, plans: plans ?? [], days_remaining: daysRemaining } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  const { testId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { planId, is_completed } = await request.json();

  const { data: plan } = await supabase
    .from('study_plans')
    .select('id, test_id')
    .eq('id', planId)
    .single();

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  const { error } = await supabase
    .from('study_plans')
    .update({ is_completed, completed_at: is_completed ? new Date().toISOString() : null })
    .eq('id', planId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { success: true } });
}

// Regenerate the study plan for this test using the stored subject config
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  const { testId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: test } = await supabase
    .from('tests')
    .select('*')
    .eq('id', testId)
    .eq('user_id', user.id)
    .single();

  if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 });

  try {
    await buildStudyPlan(
      testId,
      test.chapter_ids as string[],
      test.test_date as string,
      (test.subject_config_json ?? []) as SubjectConfig[],
      (test.plan_start_date as string | null) ?? undefined
    );
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Plan generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
