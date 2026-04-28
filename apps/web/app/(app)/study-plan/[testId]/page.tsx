import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { StudyPlanClient } from '@/components/study-plan/StudyPlanClient';

export default async function StudyPlanPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: test } = await supabase
    .from('tests')
    .select('*')
    .eq('id', testId)
    .eq('user_id', user.id)
    .single();

  if (!test) notFound();

  const { data: plans } = await supabase
    .from('study_plans')
    .select('*, chapter:chapters(id, name, complexity_score, subjects(id, name))')
    .eq('test_id', testId)
    .order('day_date');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(test.test_date);
  const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000);

  return (
    <StudyPlanClient
      test={test}
      plans={plans ?? []}
      daysRemaining={daysRemaining}
    />
  );
}
