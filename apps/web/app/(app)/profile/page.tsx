import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileClient } from '@/components/profile/ProfileClient';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, email, grade, board, contact_email, phone_number, created_at')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/auth/login');

  return <ProfileClient profile={profile as Parameters<typeof ProfileClient>[0]['profile']} />;
}
