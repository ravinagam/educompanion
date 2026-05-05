'use client';

import { useEffect, useState } from 'react';
import { Flame, Star } from 'lucide-react';
import { xpForLevel, xpForNextLevel } from '@/lib/gamification';

interface GamificationData {
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
}

export function XpBar() {
  const [data, setData] = useState<GamificationData | null>(null);

  useEffect(() => {
    fetch('/api/gamification/xp')
      .then(r => r.json())
      .then(({ data: d }) => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const level = data.level;
  const levelStart = xpForLevel(level);
  const levelEnd = xpForNextLevel(level);
  const progress = levelEnd > levelStart
    ? Math.min(100, Math.round(((data.total_xp - levelStart) / (levelEnd - levelStart)) * 100))
    : 100;
  const isMax = level >= 10;

  return (
    <div className="flex items-center gap-3">
      {/* Streak */}
      {data.current_streak > 0 && (
        <div className="flex items-center gap-1 text-orange-500" title={`${data.current_streak}-day streak`}>
          <Flame className="h-4 w-4" />
          <span className="text-xs font-semibold tabular-nums">{data.current_streak}</span>
        </div>
      )}

      {/* Level badge + XP bar */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0">
          {level}
        </div>
        <div className="hidden sm:flex flex-col gap-0.5 w-20">
          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${isMax ? 100 : progress}%` }}
            />
          </div>
          <span className="text-[9px] text-gray-400 tabular-nums leading-none">
            {isMax ? 'MAX' : `${data.total_xp - levelStart} / ${levelEnd - levelStart} XP`}
          </span>
        </div>
        <Star className="sm:hidden h-3 w-3 text-blue-500" />
      </div>
    </div>
  );
}
