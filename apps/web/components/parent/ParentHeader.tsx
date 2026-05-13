'use client';

import { useRouter } from 'next/navigation';
import { createParentBrowserClient } from '@/lib/supabase/parent-browser';
import { BookOpen, LogOut, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ParentHeader() {
  const router = useRouter();
  const supabase = createParentBrowserClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/parent-login');
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-indigo-700">
            <BookOpen className="h-5 w-5" />
            <span className="font-bold text-lg">EaseStudy</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5 text-sm text-violet-700 font-medium">
            <Users className="h-4 w-4" />
            Parent Portal
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-500 hover:text-gray-700 gap-1.5">
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </header>
  );
}
