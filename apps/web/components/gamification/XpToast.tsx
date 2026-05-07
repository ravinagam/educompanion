'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

interface XpToastProps {
  xp: number;
  multiplier?: number;
  milestoneHint?: number | null;  // XP remaining to next gift milestone
  onDone?: () => void;
}

const HINT_THRESHOLD = 500;

export function XpToast({ xp, multiplier, milestoneHint, onDone }: XpToastProps) {
  const [visible, setVisible] = useState(true);
  const showHint = milestoneHint != null && milestoneHint > 0 && milestoneHint <= HINT_THRESHOLD;

  useEffect(() => {
    const duration = showHint ? 3000 : 1800;
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDone?.(), 300);
    }, duration);
    return () => clearTimeout(t);
  }, [onDone, showHint]);

  return (
    <div
      className={`fixed bottom-20 right-4 z-50 flex flex-col items-end gap-1 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="flex items-center gap-1.5 rounded-full bg-blue-600 text-white px-3 py-1.5 text-sm font-semibold shadow-lg">
        <Star className="h-3.5 w-3.5 fill-white" />
        +{xp} XP
        {multiplier && multiplier > 1 && (
          <span className="ml-0.5 text-yellow-300 text-xs">🔥 {multiplier}× streak!</span>
        )}
      </div>
      {showHint && (
        <div className="rounded-full bg-amber-500 text-white px-3 py-1 text-xs font-medium shadow-lg">
          Only {milestoneHint!.toLocaleString()} XP to your next voucher 🎁
        </div>
      )}
    </div>
  );
}
