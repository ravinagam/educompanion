'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  {
    label: 'Performance',
    icon: BarChart2,
    href: (id: string) => `/parent/${id}`,
    activeClass: 'bg-violet-600 text-white shadow-md shadow-violet-200',
    activeIcon: 'text-white',
  },
  {
    label: 'Worksheets',
    icon: FileText,
    href: (id: string) => `/parent/${id}/worksheets`,
    activeClass: 'bg-emerald-600 text-white shadow-md shadow-emerald-200',
    activeIcon: 'text-white',
  },
];

export function StudentTabNav({ studentId }: { studentId: string }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 bg-gray-100 rounded-2xl p-1.5">
      {tabs.map(tab => {
        const href = tab.href(studentId);
        const active = pathname === href;
        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl text-base font-bold transition-all duration-200 flex-1 justify-center',
              active
                ? tab.activeClass
                : 'text-gray-400 hover:text-gray-600 hover:bg-white/60'
            )}
          >
            <tab.icon className={cn('h-4 w-4', active ? tab.activeIcon : '')} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
