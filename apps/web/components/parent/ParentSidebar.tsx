'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BookMarked, Users } from 'lucide-react';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';

const nav = [
  { label: 'My Children', href: '/parent', icon: Users },
];

export function ParentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 shrink-0">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
        <BookMarked className="h-6 w-6 text-violet-600" />
        <div>
          <span className="font-bold text-gray-900">EaseStudy</span>
          <p className="text-xs text-gray-400 leading-none">Parent Portal</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ label, href, icon: Icon }) => (
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
        ))}
      </nav>

      <div className="px-3 pb-3 border-t border-gray-100 pt-3">
        <FeedbackButton sidebar apiPath="/api/parent/feedback" />
        <p className="text-xs text-gray-400 text-center mt-2">AI-powered learning</p>
      </div>
    </aside>
  );
}
