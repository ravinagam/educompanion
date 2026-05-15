'use client';

import { useRouter } from 'next/navigation';
import { createParentBrowserClient } from '@/lib/supabase/parent-browser';
import { BookOpen, LogOut, User, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props { phone: string }

export function ParentHeader({ phone }: Props) {
  const router = useRouter();
  const supabase = createParentBrowserClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/parent-login');
    router.refresh();
  }

  // Format phone for display: last 10 digits as "XXXXX XXXXX"
  const digits = phone.replace(/\D/g, '');
  const display = digits.length >= 10
    ? digits.slice(-10).replace(/(\d{5})(\d{5})/, '$1 $2')
    : digits;

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

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-100 transition-colors outline-none">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-semibold">
                P
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:block text-sm font-medium text-gray-700">{display}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-gray-900">Parent</p>
              <p className="text-xs text-gray-400">{display}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/parent/profile')} className="flex items-center gap-2 cursor-pointer">
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 text-red-600 cursor-pointer">
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
