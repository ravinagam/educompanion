import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ParentHeader } from '@/components/parent/ParentHeader';

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'parent') redirect('/parent-login');

  return (
    <div className="min-h-screen bg-gray-50">
      <ParentHeader />
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
