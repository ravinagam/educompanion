'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';

const OPTIONS = [
  { emoji: '👍', label: 'Helpful', rating: 5 },
  { emoji: '🤔', label: 'Somewhat', rating: 3 },
  { emoji: '👎', label: 'Not helpful', rating: 1 },
];

interface Props {
  chapterId: string;
  activityType: 'quiz' | 'video' | 'flashcards';
  prompt?: string;
  onDone?: () => void;
}

const STORAGE_KEY = (chapterId: string, type: string) => `activityRated:${chapterId}:${type}`;

export function ActivityRatingPrompt({ chapterId, activityType, prompt, onDone }: Props) {
  const [done, setDone] = useState(false);
  const [visible, setVisible] = useState(true);
  const pathname = usePathname();

  if (!visible || done) return null;

  const defaultPrompt = activityType === 'quiz'
    ? 'Was this quiz helpful?'
    : activityType === 'video'
    ? 'Was this video helpful?'
    : 'Were the flashcards helpful?';

  async function rate(rating: number, label: string) {
    setDone(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY(chapterId, activityType), '1');
    }
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${label} — ${activityType} activity on chapter`,
          page: pathname,
          rating,
          category: 'activity',
        }),
      });
    } catch { /* silent */ }
    onDone?.();
  }

  return (
    <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
      <p className="text-sm font-medium text-gray-700 flex-1">{prompt ?? defaultPrompt}</p>
      <div className="flex gap-1">
        {OPTIONS.map(({ emoji, label, rating }) => (
          <button
            key={rating}
            onClick={() => rate(rating, label)}
            title={label}
            className="text-xl hover:scale-125 transition-transform active:scale-95 px-1"
          >
            {emoji}
          </button>
        ))}
      </div>
      <button onClick={() => { setVisible(false); onDone?.(); }} className="text-gray-300 hover:text-gray-500 transition-colors ml-1">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function shouldShowActivityRating(chapterId: string, activityType: string): boolean {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem(STORAGE_KEY(chapterId, activityType));
}
