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
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
      {tabs.map(tab => {
        const href = tab.href(studentId);
        const active = pathname === href;
        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex-1 justify-center',
              active
                ? tab.activeClass
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
