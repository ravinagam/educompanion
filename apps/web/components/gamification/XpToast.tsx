'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

interface XpToastProps {
  xp: number;
  multiplier?: number;
  onDone?: () => void;
}

export function XpToast({ xp, multiplier, onDone }: XpToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDone?.(), 300);
    }, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className={`fixed bottom-20 right-4 z-50 flex items-center gap-1.5 rounded-full bg-blue-600 text-white px-3 py-1.5 text-sm font-semibold shadow-lg transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <Star className="h-3.5 w-3.5 fill-white" />
      +{xp} XP
      {multiplier && multiplier > 1 && (
        <span className="ml-0.5 text-yellow-300 text-xs">🔥 {multiplier}× streak!</span>
      )}
    </div>
  );
}
