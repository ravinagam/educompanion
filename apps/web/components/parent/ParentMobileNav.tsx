'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Menu, BookMarked, Users } from 'lucide-react';

const nav = [
  { label: 'My Children', href: '/parent', icon: Users },
];

export function ParentMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-100 transition-colors">
          <Menu className="h-5 w-5" />
        </SheetTrigger>

        <SheetContent side="left" className="w-56 p-0 flex flex-col">
          <div className="flex items-center gap-2 px-6 py-5 border-b shrink-0">
            <BookMarked className="h-6 w-6 text-violet-600" />
            <div>
              <span className="font-bold">EaseStudy</span>
              <p className="text-xs text-gray-400 leading-none">Parent Portal</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {nav.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
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
        </SheetContent>
      </Sheet>
    </div>
  );
}
