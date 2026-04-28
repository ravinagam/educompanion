import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SavedChaptersClient } from '@/components/chapters/SavedChaptersClient';

export default async function ChaptersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: subjects } = await supabase
    .from('subjects')
    .select('*, chapters(id, name, upload_status, complexity_score, created_at, file_name, file_size_bytes)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  return <SavedChaptersClient subjects={subjects ?? []} />;
}
