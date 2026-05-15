'use client';

import { useRouter } from 'next/navigation';
import { createParentBrowserClient } from '@/lib/supabase/parent-browser';
import { formatParentPhone } from '@/lib/parent-auth';
import { LogOut, User, Users, BookOpen } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ParentMobileNav } from './ParentMobileNav';

interface Props { phone: string }

export function ParentHeader({ phone }: Props) {
  const router = useRouter();
  const supabase = createParentBrowserClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/parent-login');
    router.refresh();
  }

  const display = formatParentPhone(phone);

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-200 shrink-0">
      {/* Mobile: hamburger + brand */}
      <div className="flex items-center gap-3">
        <ParentMobileNav />
        {/* Brand shown on mobile only (desktop has it in sidebar) */}
        <div className="flex items-center gap-2 text-indigo-700 md:hidden">
          <BookOpen className="h-5 w-5" />
          <span className="font-bold">EaseStudy</span>
          <span className="text-gray-300 text-sm">| Parent</span>
        </div>
      </div>

      {/* Right: avatar dropdown */}
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
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-violet-500" /> Parent
            </p>
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
    </header>
  );
}
