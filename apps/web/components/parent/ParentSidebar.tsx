'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BookMarked, Users, Gift } from 'lucide-react';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';

const topNav = [
  { label: 'My Children Performance', href: '/parent', icon: Users },
];

const bottomNav = [
  { label: 'Refer & Earn', href: '/parent/refer', icon: Gift },
];

export function ParentSidebar() {
  const pathname = usePathname();

  function navLink({ label, href, icon: Icon }: { label: string; href: string; icon: React.ElementType }) {
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          pathname === href
            ? 'bg-violet-50 text-violet-700'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </Link>
    );
  }

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 shrink-0">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
        <BookMarked className="h-6 w-6 text-violet-600" />
        <div>
          <span className="font-bold text-gray-900">EaseStudy</span>
          <p className="text-xs text-gray-400 leading-none">Parent Portal</p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col px-3 py-4">
        <div className="space-y-1">
          {topNav.map(navLink)}
        </div>
        <div className="mt-auto space-y-1 pt-2 border-t border-gray-100">
          {bottomNav.map(navLink)}
          <FeedbackButton sidebar apiPath="/api/parent/feedback" />
        </div>
      </nav>

      <div className="px-3 pb-3 border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-400 text-center">AI-powered learning</p>
      </div>
    </aside>
  );
}
