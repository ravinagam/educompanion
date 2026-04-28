import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UploadClient } from '@/components/upload/UploadClient';

export default async function UploadPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  return <UploadClient subjects={subjects ?? []} />;
}
