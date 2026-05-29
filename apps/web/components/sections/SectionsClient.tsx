'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock,
  Lock, Play, Layers, Loader2, RefreshCw,
} from 'lucide-react';

interface SectionProgress {
  read_done: boolean;
  chat_done: boolean;
  quiz_score: number | null;
  completed_at: string | null;
}

interface Section {
  id: string;
  title: string;
  order_index: number;
  estimated_minutes: number;
  has_mini_quiz: boolean;
  progress: SectionProgress | null;
}

interface Props {
  chapter: { id: string; name: string; upload_status: string };
  subjectName: string;
  sections: Section[];
}

function sectionStatus(s: Section, isUnlocked: boolean): 'completed' | 'in_progress' | 'unlocked' | 'locked' {
  if (s.progress?.completed_at) return 'completed';
  if (!isUnlocked) return 'locked';
  if (s.progress?.read_done || s.progress?.chat_done || s.progress?.quiz_score != null) return 'in_progress';
  return 'unlocked';
}

function stepsCompleted(p: SectionProgress | null): number {
  if (!p) return 0;
  return (p.read_done ? 1 : 0) + (p.chat_done ? 1 : 0) + (p.quiz_score != null ? 1 : 0);
}

export function SectionsClient({ chapter, subjectName, sections }: Props) {
  const router = useRouter();
  const [pollAttempts, setPollAttempts] = useState(0);
  const [generationKey, setGenerationKey] = useState(0);
  const [generating, setGenerating] = useState(false);

  // While the chapter is still processing (upload or reprocess), poll until it becomes ready
  useEffect(() => {
    if (chapter.upload_status === 'ready') return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [chapter.upload_status, router]);

  // When sections are missing for a ready chapter, auto-trigger generation once, then poll
  useEffect(() => {
    setPollAttempts(0);
    if (sections.length > 0 || chapter.upload_status !== 'ready') return;

    // Auto-trigger generation immediately (covers both fresh uploads and existing chapters)
    let cancelled = false;
    fetch(`/api/chapters/${chapter.id}/sections/generate`, { method: 'POST' })
      .then(r => r.json())
      .then(json => {
        if (!cancelled && json.error) console.warn('[sections] Auto-generate failed:', json.error);
      })
      .catch(err => console.warn('[sections] Auto-generate error:', err));

    // Poll every 5s until sections appear (up to ~120s — Hindi PDFs take longer)
    let attempts = 0;
    const id = setInterval(() => {
      attempts++;
      setPollAttempts(attempts);
      router.refresh();
      if (attempts >= 24) clearInterval(id); // stop after ~120s
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sections.length, chapter.upload_status, chapter.id, router, generationKey]);

  async function generateSections() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/chapters/${chapter.id}/sections/generate`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to start generation');
      } else {
        toast.success('Generating sections… this takes about 30 seconds.');
        setGenerationKey(k => k + 1); // restart the poll cycle
      }
    } finally {
      setGenerating(false);
    }
  }

  const completedCount = sections.filter(s => s.progress?.completed_at).length;
  const totalMinutes = sections.reduce((s, sec) => s + sec.estimated_minutes, 0);
  const progressPercent = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;

  if (chapter.upload_status !== 'ready') {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Link href={`/chapters?subject=${encodeURIComponent(subjectName)}`} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Back to Chapters
        </Link>
        <div className="text-center py-16 text-gray-400 space-y-3">
          <RefreshCw className="h-10 w-10 mx-auto animate-spin opacity-30" />
          <p className="font-medium">
            {chapter.upload_status === 'error' ? 'Processing failed' : 'Re-extracting content…'}
          </p>
          <p className="text-sm">
            {chapter.upload_status === 'error'
              ? 'Something went wrong. Please re-upload the chapter.'
              : 'This takes 1–2 minutes. The page will update automatically.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link href={`/chapters?subject=${encodeURIComponent(subjectName)}`} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Back to Chapters
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{subjectName} — {chapter.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Study section by section, test your understanding as you go</p>
      </div>

      {/* Overall progress */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Chapter Progress</span>
            <span className="text-gray-500">{completedCount} of {sections.length} sections · {totalMinutes} min total</span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
          <p className="text-xs text-gray-400 text-right">{progressPercent}% complete</p>
        </CardContent>
      </Card>

      {/* Sections list */}
      {sections.length === 0 ? (
        <div className="text-center py-16 text-gray-400 space-y-3">
          {pollAttempts < 24 ? (
            <>
              <RefreshCw className="h-10 w-10 mx-auto animate-spin opacity-30" />
              <p className="font-medium">Generating sections…</p>
              <p className="text-sm">This usually takes 1–2 minutes.</p>
            </>
          ) : (
            <>
              <Layers className="h-10 w-10 mx-auto opacity-30" />
              <p className="font-medium">Generation is taking longer than expected</p>
              <p className="text-sm">Click below to try again.</p>
              <Button
                onClick={generateSections}
                disabled={generating}
                className="mt-2"
              >
                {generating
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating…</>
                  : 'Retry Generate Sections'}
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, idx) => {
            // First section always unlocked; subsequent unlock when previous completed
            const isUnlocked = idx === 0 || !!sections[idx - 1].progress?.completed_at;
            const status = sectionStatus(section, isUnlocked);
            const steps = stepsCompleted(section.progress);

            return (
              <Card
                key={section.id}
                className={`border transition-all ${
                  status === 'completed' ? 'border-emerald-200 bg-emerald-50/40' :
                  status === 'in_progress' ? 'border-blue-200 ring-1 ring-blue-100' :
                  status === 'locked' ? 'border-gray-100 opacity-60' :
                  'border-gray-200'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Status icon */}
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      status === 'completed' ? 'bg-emerald-500 text-white' :
                      status === 'in_progress' ? 'bg-blue-500 text-white' :
                      status === 'locked' ? 'bg-gray-100 text-gray-300' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> :
                       status === 'locked' ? <Lock className="h-4 w-4" /> :
                       idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-medium text-sm ${status === 'locked' ? 'text-gray-400' : 'text-gray-900'}`}>
                          {section.title}
                        </p>
                        {status === 'completed' && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Done</Badge>
                        )}
                        {status === 'in_progress' && (
                          <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">In Progress</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />{section.estimated_minutes} min
                        </span>
                        {status !== 'locked' && (
                          <span className="text-xs text-gray-400">
                            {steps}/3 steps done
                          </span>
                        )}
                      </div>
                      {/* Mini step indicators */}
                      {status !== 'locked' && (
                        <div className="flex gap-1.5 mt-2">
                          {[
                            { label: 'Read', done: section.progress?.read_done ?? false, icon: BookOpen },
                            { label: 'Ask AI', done: section.progress?.chat_done ?? false, icon: BookOpen },
                            { label: 'Quiz', done: section.progress?.quiz_score != null, icon: BookOpen },
                          ].map(({ label, done }) => (
                            <span
                              key={label}
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                done ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {done ? '✓ ' : ''}{label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    {status !== 'locked' && (
                      <Link
                        href={`/chapters/${chapter.id}/sections/${section.id}`}
                        className={`flex-shrink-0 flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          status === 'completed'
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {status === 'completed' ? 'Review' : <><Play className="h-3.5 w-3.5" />Study</>}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {completedCount === sections.length && sections.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-center space-y-2">
            <p className="text-lg font-bold text-amber-800">🎉 All sections complete!</p>
            <p className="text-sm text-amber-700">You&apos;ve covered every section. Ready for the full chapter quiz?</p>
            <Link
              href={`/chapters/${chapter.id}/quiz`}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm px-4 py-2 rounded-lg mt-1"
            >
              Take Chapter Quiz <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
