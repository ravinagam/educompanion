'use client';

import { CheckCircle2, ArrowRight } from 'lucide-react';

const PRIORITY_COLORS = ['bg-rose-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500'];

export function RecommendationsPanel({ recommendations }: { recommendations: string[] }) {
  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {recommendations.map((rec, i) => (
        <div key={i} className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
          <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${PRIORITY_COLORS[i] ?? 'bg-gray-400'}`} />
          <p className="text-sm text-gray-700 flex-1">{rec}</p>
          <ArrowRight className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
        </div>
      ))}
      <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1 pt-1">
        <CheckCircle2 className="h-3.5 w-3.5" /> Share these with your child to help them improve
      </p>
    </div>
  );
}
