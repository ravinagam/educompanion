import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TestPlannerClient } from '@/components/study-plan/TestPlannerClient';

export default async function TestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [testsRes, chaptersRes] = await Promise.all([
    supabase
      .from('tests')
      .select('*')
      .eq('user_id', user.id)
      .order('test_date'),
    supabase
      .from('chapters')
      .select('id, name, upload_status, subjects!inner(id, name, user_id)')
      .eq('subjects.user_id', user.id)
      .eq('upload_status', 'ready'),
  ]);

  return (
    <TestPlannerClient
      tests={testsRes.data ?? []}
      chapters={(chaptersRes.data ?? []).map(c => {
        const subj = c.subjects as unknown as { id: string; name: string };
        return {
          id: c.id,
          name: c.name,
          upload_status: c.upload_status,
          subject_id: subj.id,
          subject_name: subj.name,
        };
      })}
    />
  );
}
