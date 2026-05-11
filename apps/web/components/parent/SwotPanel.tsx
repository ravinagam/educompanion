'use client';

import type { ParentInsight } from '@/lib/ai/parent-insights';
import { Sparkles } from 'lucide-react';

interface QuadrantProps {
  letter: string;
  title: string;
  items: string[];
  bg: string;
  headerBg: string;
  textColor: string;
  dotColor: string;
}

function Quadrant({ letter, title, items, bg, headerBg, textColor, dotColor }: QuadrantProps) {
  return (
    <div className={`rounded-xl overflow-hidden ${bg}`}>
      <div className={`${headerBg} px-3 py-2 flex items-center gap-2`}>
        <span className={`text-sm font-black ${textColor}`}>{letter}</span>
        <span className={`text-xs font-semibold ${textColor}`}>{title}</span>
      </div>
      <ul className="px-3 py-3 space-y-2">
        {items.length === 0 ? (
          <li className="text-xs text-gray-400 italic">Not enough data yet</li>
        ) : items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
            <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SwotPanel({ insights, generatedAt }: { insights: ParentInsight; generatedAt: string }) {
  const age = Math.floor((Date.now() - new Date(generatedAt).getTime()) / 60000);
  const ageLabel = age < 60 ? `${age}m ago` : `${Math.floor(age / 60)}h ago`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span>AI-generated · {ageLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Quadrant
          letter="S" title="Strengths"
          items={insights.strengths}
          bg="bg-emerald-50" headerBg="bg-emerald-100"
          textColor="text-emerald-800" dotColor="bg-emerald-500"
        />
        <Quadrant
          letter="W" title="Weaknesses"
          items={insights.weaknesses}
          bg="bg-rose-50" headerBg="bg-rose-100"
          textColor="text-rose-800" dotColor="bg-rose-500"
        />
        <Quadrant
          letter="O" title="Opportunities"
          items={insights.opportunities}
          bg="bg-blue-50" headerBg="bg-blue-100"
          textColor="text-blue-800" dotColor="bg-blue-500"
        />
        <Quadrant
          letter="T" title="Threats"
          items={insights.threats}
          bg="bg-amber-50" headerBg="bg-amber-100"
          textColor="text-amber-800" dotColor="bg-amber-500"
        />
      </div>
    </div>
  );
}
