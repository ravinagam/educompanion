'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, BookOpen, Star, Lightbulb,
  ClipboardList, RefreshCw, CheckCircle2,
} from 'lucide-react';

interface Summary {
  quick_recap: string;
  key_points: string[];
  key_concepts: { term: string; explanation: string }[];
  exam_tips: string[];
}

interface Props {
  chapter: { id: string; name: string };
  subjectName: string;
  initialSummary: Summary | null;
}

export function ChapterSummaryClient({ chapter, subjectName, initialSummary }: Props) {
  const [summary, setSummary] = useState<Summary | null>(initialSummary);
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/chapters/${chapter.id}/summary`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Generation failed');
      } else {
        setSummary(json.summary);
        toast.success('Summary generated!');
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setGenerating(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 px-5 py-4 text-white shadow-md">
        <Link href="/chapters" className="text-amber-100 hover:text-white flex items-center gap-1 text-xs mb-1 transition-colors">
          <ArrowLeft className="h-3 w-3" /> My Saved Chapters
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">{subjectName} — {chapter.name}</p>
              <p className="text-amber-100 text-xs">Chapter Summary</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={generate}
            disabled={generating}
            className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs gap-1.5 shrink-0"
          >
            {generating
              ? <><Loader2 className="h-3 w-3 animate-spin" />Generating…</>
              : <><RefreshCw className="h-3 w-3" />{summary ? 'Regenerate' : 'Generate'}</>}
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {!summary && !generating && (
        <Card className="border-0 shadow-md">
          <CardContent className="p-10 text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">
              <ClipboardList className="h-7 w-7 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">No summary yet</p>
              <p className="text-sm text-gray-500 mt-1">Generate a concise summary with key points, concepts, and exam tips.</p>
            </div>
            <Button onClick={generate} className="bg-amber-500 hover:bg-amber-600 text-white">
              Generate Summary with AI
            </Button>
          </CardContent>
        </Card>
      )}

      {generating && !summary && (
        <Card className="border-0 shadow-md">
          <CardContent className="p-10 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto" />
            <p className="text-gray-600 font-medium">Generating your summary…</p>
            <p className="text-sm text-gray-400">This takes about 15 seconds</p>
          </CardContent>
        </Card>
      )}

      {summary && (
        <div className="space-y-4">
          {/* Quick Recap */}
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-4 py-3 flex items-center gap-2 text-white font-semibold text-sm">
              <BookOpen className="h-4 w-4" /> Quick Recap
            </div>
            <CardContent className="p-4">
              <p className="text-gray-800 text-sm leading-relaxed">{summary.quick_recap}</p>
            </CardContent>
          </Card>

          {/* Key Points */}
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center gap-2 text-white font-semibold text-sm">
              <Star className="h-4 w-4" /> Key Points to Remember
            </div>
            <CardContent className="p-4">
              <ul className="space-y-2.5">
                {summary.key_points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-800">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    {pt}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Key Concepts */}
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 flex items-center gap-2 text-white font-semibold text-sm">
              <Lightbulb className="h-4 w-4" /> Key Concepts
            </div>
            <CardContent className="p-4">
              <div className="space-y-2.5">
                {summary.key_concepts.map((c, i) => (
                  <div key={i} className="rounded-lg bg-violet-50 border border-violet-100 px-3 py-2.5">
                    <p className="text-xs font-bold text-violet-700 uppercase tracking-wide">{c.term}</p>
                    <p className="text-sm text-gray-700 mt-0.5">{c.explanation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Exam Tips */}
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center gap-2 text-white font-semibold text-sm">
              <ClipboardList className="h-4 w-4" /> Exam Tips
            </div>
            <CardContent className="p-4">
              <ul className="space-y-2.5">
                {summary.exam_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-800">
                    <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Quick links */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <Link href={`/chapters/${chapter.id}/quiz`}>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold text-center py-3 transition-colors">Quiz</div>
            </Link>
            <Link href={`/chapters/${chapter.id}/flashcards`}>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold text-center py-3 transition-colors">Flashcards</div>
            </Link>
            <Link href={`/chapters/${chapter.id}/chat`}>
              <div className="rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold text-center py-3 transition-colors">Ask AI</div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
