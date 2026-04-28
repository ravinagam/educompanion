import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile?.onboarding_done) redirect('/onboarding');

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AppSidebar user={profile} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AppHeader user={profile} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
      <FeedbackButton />
    </div>
  );
}
