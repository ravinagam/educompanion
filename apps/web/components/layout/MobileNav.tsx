'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Menu, BookMarked, LayoutDashboard, Upload, CalendarCheck, BookOpen } from 'lucide-react';
import type { User } from '@educompanion/shared';

const nav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Upload Chapter', href: '/upload', icon: Upload },
  { label: 'Study Planner', href: '/tests', icon: CalendarCheck },
  { label: 'My Saved Chapters', href: '/chapters', icon: BookOpen },
];

interface Props { user: User }

export function MobileNav({ user }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-100 transition-colors">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex items-center gap-2 px-6 py-5 border-b">
            <BookMarked className="h-6 w-6 text-blue-600" />
            <div>
              <span className="font-bold">EaseMyStudy</span>
              <p className="text-xs text-gray-400 leading-none">by Bodhly</p>
            </div>
          </div>
          <div className="px-4 py-3 border-b">
            <p className="font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-400">Class {user.grade} · {user.board}</p>
          </div>
          <nav className="px-3 py-4 space-y-1">
            {nav.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
