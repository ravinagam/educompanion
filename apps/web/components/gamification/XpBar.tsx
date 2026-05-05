'use client';

import { useEffect, useState, useRef } from 'react';
import { Flame } from 'lucide-react';
import { xpForLevel, xpForNextLevel } from '@/lib/gamification';

interface GamificationData {
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
}

export function XpBar() {
  const [data, setData] = useState<GamificationData | null>(null);
  const [xpOpen, setXpOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const xpRef = useRef<HTMLDivElement>(null);
  const streakRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/gamification/xp')
      .then(r => r.json())
      .then(({ data: d }) => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  // Close tooltips when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (xpRef.current && !xpRef.current.contains(e.target as Node)) setXpOpen(false);
      if (streakRef.current && !streakRef.current.contains(e.target as Node)) setStreakOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
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
        <div ref={streakRef} className="relative flex items-center gap-1 text-orange-500 cursor-pointer select-none"
          onClick={() => setStreakOpen(o => !o)}
          onMouseEnter={() => setStreakOpen(true)}
          onMouseLeave={() => setStreakOpen(false)}
        >
          <Flame className="h-4 w-4" />
          <span className="text-xs font-semibold tabular-nums">{data.current_streak}</span>
          {streakOpen && (
            <div className="absolute top-8 left-0 z-50 w-44 rounded-lg bg-gray-900 text-white text-xs shadow-xl p-3 space-y-1">
              <p className="font-semibold">{data.current_streak}-day streak 🔥</p>
              <p className="text-gray-400">Study every day to keep it going. Best: {data.longest_streak} days</p>
            </div>
          )}
        </div>
      )}

      {/* Level badge + XP bar */}
      <div ref={xpRef} className="flex items-center gap-1.5 cursor-pointer select-none"
        onClick={() => setXpOpen(o => !o)}
        onMouseEnter={() => setXpOpen(true)}
        onMouseLeave={() => setXpOpen(false)}
      >
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0">
          {level}
        </div>
        <div className="flex flex-col gap-0.5 w-16 sm:w-20">
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

        {/* Tooltip — click on mobile, hover on desktop */}
        {xpOpen && (
          <div className="absolute top-12 right-4 z-50 w-52 rounded-lg bg-gray-900 text-white text-xs shadow-xl p-3 space-y-1.5">
            <p className="font-semibold text-white">Level {level} · {data.total_xp.toLocaleString()} XP</p>
            {!isMax && <p className="text-gray-400">{levelEnd - data.total_xp} XP to level {level + 1}</p>}
            <div className="border-t border-white/10 pt-1.5 space-y-0.5 text-gray-300">
              <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-1">How to earn XP</p>
              <p>+25 · Upload a chapter</p>
              <p>+50 · Complete a quiz</p>
              <p>+30 · Score ≥80% on a quiz</p>
              <p>+5 · Mark a flashcard known</p>
              <p>+30 · Watch a video to the end</p>
              <p>+10 · Generate a summary</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
