'use client';

import { AlertTriangle, BookOpen } from 'lucide-react';

export interface WeakChapter {
  subject: string;
  chapter: string;
  reason: 'never_attempted' | 'low_score' | 'not_mastered';
  score_pct: number | null;
}

const REASON_LABEL: Record<WeakChapter['reason'], string> = {
  never_attempted: 'Quiz never taken',
  low_score: 'Low quiz score',
  not_mastered: 'Flashcards incomplete',
};

const REASON_COLOR: Record<WeakChapter['reason'], string> = {
  never_attempted: 'bg-rose-100 text-rose-700',
  low_score: 'bg-amber-100 text-amber-700',
  not_mastered: 'bg-indigo-100 text-indigo-700',
};

export function WeakTopicsPanel({ chapters, studentView = false }: { chapters: WeakChapter[]; studentView?: boolean }) {
  if (chapters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <div className="text-3xl">🎉</div>
        <p className="text-sm font-semibold text-emerald-700">All chapters are on track!</p>
        <p className="text-xs text-gray-400">No weak topics detected at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chapters.slice(0, 8).map((ch, i) => (
        <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
          <div className="h-7 w-7 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0">
            <BookOpen className="h-3.5 w-3.5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{ch.chapter}</p>
            <p className="text-xs text-gray-400">{ch.subject}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {ch.score_pct !== null && (
              <span className="text-xs font-bold text-rose-600">{ch.score_pct}%</span>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${REASON_COLOR[ch.reason]}`}>
              {REASON_LABEL[ch.reason]}
            </span>
          </div>
        </div>
      ))}
      {chapters.length > 8 && (
        <p className="text-xs text-gray-400 text-center pt-1">+{chapters.length - 8} more weak topics</p>
      )}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 mt-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          {studentView
            ? 'Revisit these chapters and retake the quizzes until you score above 70%.'
            : 'Ask your child to revisit these chapters and retake the quizzes until they score above 70%.'}
        </p>
      </div>
    </div>
  );
}
