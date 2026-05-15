import { redirect } from 'next/navigation';
import { createParentServerClient } from '@/lib/supabase/parent-server';
import { ParentHeader } from '@/components/parent/ParentHeader';
import { ParentSidebar } from '@/components/parent/ParentSidebar';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createParentServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/parent-login');

  const phone = user.email?.split('@')[0] ?? '';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <ParentSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <ParentHeader phone={phone} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
      {/* Floating feedback button — mobile only (desktop has it in sidebar) */}
      <div className="md:hidden">
        <FeedbackButton apiPath="/api/parent/feedback" />
      </div>
    </div>
  );
}
