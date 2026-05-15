import { redirect } from 'next/navigation';
import { createParentServerClient } from '@/lib/supabase/parent-server';
import { ParentProfileClient } from '@/components/parent/ParentProfileClient';

export default async function ParentProfilePage() {
  const supabase = await createParentServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/parent-login');

  const phone = (user.user_metadata?.phone as string | undefined) ?? user.email?.split('@')[0] ?? '';

  return <ParentProfileClient phone={phone} email={user.email ?? ''} />;
}
