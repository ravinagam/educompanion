import { redirect } from 'next/navigation';
import { createParentServerClient } from '@/lib/supabase/parent-server';
import { ParentHeader } from '@/components/parent/ParentHeader';

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createParentServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/parent-login');

  // Derive phone from internal email: "919876543210@parents.educompanion.app" → "919876543210"
  const phone = user.email?.split('@')[0] ?? '';

  return (
    <div className="min-h-screen bg-gray-50">
      <ParentHeader phone={phone} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
