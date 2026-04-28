'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Upload, CalendarCheck, BookOpen,
  FlaskConical, Layers, BookMarked
} from 'lucide-react';
import type { User } from '@educompanion/shared';

const nav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Upload Material', href: '/upload', icon: Upload },
  { label: 'Study Planner', href: '/tests', icon: CalendarCheck },
  { label: 'My Saved Chapters', href: '/chapters', icon: BookOpen },
];

interface Props { user: User }

export function AppSidebar({ user }: Props) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shrink-0">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
        <BookMarked className="h-6 w-6 text-blue-600" />
        <span className="font-bold text-gray-900">EduCompanion</span>
      </div>

      <div className="px-4 py-4 border-b border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Student</p>
        <p className="font-medium text-gray-800 truncate">{user.name}</p>
        <p className="text-xs text-gray-400">Class {user.grade} · {user.board}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">AI-powered learning</p>
      </div>
    </aside>
  );
}
