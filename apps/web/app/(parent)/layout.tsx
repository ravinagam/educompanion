import { redirect } from 'next/navigation';
import { createParentServerClient } from '@/lib/supabase/parent-server';
import { ParentHeader } from '@/components/parent/ParentHeader';
import { ParentSidebar } from '@/components/parent/ParentSidebar';

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createParentServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/parent-login');

  const phone = (user.user_metadata?.phone as string | undefined) ?? user.email?.split('@')[0] ?? '';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <ParentSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <ParentHeader phone={phone} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
