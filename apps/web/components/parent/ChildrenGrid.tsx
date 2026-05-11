'use client';

import { useRouter } from 'next/navigation';
import { Flame, Trophy, BookOpen, TrendingUp, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ChildPreview {
  id: string;
  name: string;
  grade: number;
  board: string;
  total_xp: number;
  level: number;
  current_streak: number;
  chapters_mastered: number;
  chapters_total: number;
  last_quiz_score_pct: number | null;
  days_since_active: number | null;
}

function scoreColor(pct: number) {
  if (pct >= 80) return 'bg-emerald-100 text-emerald-700';
  if (pct >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

function activityLabel(days: number | null) {
  if (days === null) return { text: 'No activity yet', color: 'text-gray-400' };
  if (days === 0) return { text: 'Active today', color: 'text-emerald-600' };
  if (days === 1) return { text: 'Active yesterday', color: 'text-emerald-500' };
  if (days <= 3) return { text: `Active ${days}d ago`, color: 'text-amber-600' };
  return { text: `Inactive ${days}d`, color: 'text-rose-500' };
}

export function ChildrenGrid({ children }: { children: ChildPreview[] }) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {children.map(child => {
        const activity = activityLabel(child.days_since_active);
        const masteryPct = child.chapters_total > 0
          ? Math.round((child.chapters_mastered / child.chapters_total) * 100)
          : 0;

        return (
          <button
            key={child.id}
            onClick={() => router.push(`/parent/${child.id}`)}
            className="text-left group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-md hover:shadow-xl hover:border-violet-200 hover:scale-[1.02] transition-all duration-200 p-5"
          >
            {/* Top row */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
                  {child.name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">{child.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge className="bg-indigo-50 text-indigo-700 border-0 text-xs">Class {child.grade}</Badge>
                    <Badge className="bg-violet-50 text-violet-700 border-0 text-xs">{child.board}</Badge>
                  </div>
                </div>
              </div>
              {child.last_quiz_score_pct !== null && (
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${scoreColor(child.last_quiz_score_pct)}`}>
                  {child.last_quiz_score_pct}%
                </span>
              )}
            </div>

            {/* KPI mini row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-amber-50 rounded-xl p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-amber-600 mb-0.5">
                  <Flame className="h-3.5 w-3.5" />
                  <span className="text-base font-black">{child.current_streak}</span>
                </div>
                <p className="text-xs text-amber-700 font-medium">Day Streak</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-indigo-600 mb-0.5">
                  <Trophy className="h-3.5 w-3.5" />
                  <span className="text-base font-black">{child.level}</span>
                </div>
                <p className="text-xs text-indigo-700 font-medium">Level</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-600 mb-0.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span className="text-base font-black">{child.chapters_mastered}</span>
                </div>
                <p className="text-xs text-emerald-700 font-medium">Mastered</p>
              </div>
            </div>

            {/* Mastery bar */}
            {child.chapters_total > 0 && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Mastery</span>
                  <span className="font-semibold">{masteryPct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
                    style={{ width: `${masteryPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Last active */}
            <div className={`flex items-center gap-1 text-xs ${activity.color}`}>
              <Clock className="h-3 w-3" />
              {activity.text}
            </div>

            <div className="absolute bottom-3 right-4 text-xs text-gray-300 group-hover:text-violet-400 transition-colors font-medium">
              View Report →
            </div>
          </button>
        );
      })}
    </div>
  );
}
