'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  Menu, BookMarked, LayoutDashboard, Upload, CalendarCheck,
  BookOpen, HelpCircle, Gift, TrendingUp,
} from 'lucide-react';
import type { User } from '@educompanion/shared';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';

const mainNav = [
  { label: 'Dashboard',         href: '/dashboard',  icon: LayoutDashboard },
  { label: 'Upload Chapter',    href: '/upload',      icon: Upload },
  { label: 'Study Planner',     href: '/tests',       icon: CalendarCheck },
  { label: 'My Saved Chapters', href: '/chapters',    icon: BookOpen },
  { label: 'My Performance',    href: '/performance', icon: TrendingUp },
];

const bottomNav = [
  { label: 'How to Use',  href: '/guide',   icon: HelpCircle },
  { label: 'Refer & Earn', href: '/rewards', icon: Gift },
];

interface Props { user: User }

export function MobileNav({ user }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkClass = (href: string) => cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
    pathname === href
      ? 'bg-blue-50 text-blue-700'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
  );

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-100 transition-colors">
          <Menu className="h-5 w-5" />
        </SheetTrigger>

        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          {/* Brand */}
          <div className="flex items-center gap-2 px-6 py-5 border-b shrink-0">
            <BookMarked className="h-6 w-6 text-blue-600" />
            <div>
              <span className="font-bold">EaseStudy</span>
              <p className="text-xs text-gray-400 leading-none">by Bodhly</p>
            </div>
          </div>

          {/* Student info */}
          <div className="px-4 py-3 border-b shrink-0">
            <p className="font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-400">Class {user.grade} · {user.board}</p>
          </div>

          {/* Main nav — fills available space */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {mainNav.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={linkClass(href)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Bottom links — pinned to bottom, mirrors desktop sidebar footer */}
          <div className="px-3 pb-3 border-t border-gray-100 pt-3 shrink-0">
            {bottomNav.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={linkClass(href)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
            <FeedbackButton sidebar />
            <p className="text-xs text-gray-400 text-center mt-2">AI-powered learning</p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
