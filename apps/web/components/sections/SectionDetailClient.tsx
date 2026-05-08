'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, BookOpen, MessageCircle,
  FlaskConical, CheckCircle2, Loader2, Star, RefreshCw,
} from 'lucide-react';
import { XpToast } from '@/components/gamification/XpToast';

interface Question {
  id: string;
  type: string;
  question: string;
  options: string[];
}

interface Progress {
  read_done: boolean;
  chat_done: boolean;
  quiz_score: number | null;
  completed_at: string | null;
}

interface Props {
  chapter: { id: string; name: string };
  subjectName: string;
  section: {
    id: string;
    title: string;
    content_text: string;
    order_index: number;
    estimated_minutes: number;
    mini_quiz: Question[] | null;
    quiz_generating: boolean;
    total_sections: number;
  };
  progress: Progress | null;
  nextSection: { id: string; title: string } | null;
}

type Step = 'read' | 'chat' | 'quiz' | 'done';

function stepIndex(step: Step) {
  return { read: 0, chat: 1, quiz: 2, done: 3 }[step];
}

export function SectionDetailClient({ chapter, subjectName, section, progress: initialProgress, nextSection }: Props) {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress>(initialProgress ?? {
    read_done: false, chat_done: false, quiz_score: null, completed_at: null,
  });

  // Determine active step from progress
  // NOTE: must check !initialProgress first — optional chaining like
  // `initialProgress?.quiz_score !== null` evaluates to `undefined !== null` = true
  // when initialProgress is null, incorrectly jumping to 'done'.
  const initialStep: Step = !initialProgress
    ? 'read'
    : initialProgress.completed_at
    ? 'done'
    : initialProgress.quiz_score !== null
    ? 'done'
    : initialProgress.chat_done
    ? 'quiz'
    : initialProgress.read_done
    ? 'chat'
    : 'read';
  const [step, setStep] = useState<Step>(initialStep);
  const [saving, setSaving] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; xp: number } | null>(
    initialProgress?.quiz_score != null
      ? { score: initialProgress.quiz_score, xp: 0 }
      : null
  );
  const [xpToast, setXpToast] = useState<{ xp: number } | null>(null);

  async function patch(body: object) {
    setSaving(true);
    try {
      const res = await fetch(`/api/chapters/${chapter.id}/sections/${section.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? 'Failed to save progress'); return null; }
      return json;
    } finally {
      setSaving(false);
    }
  }

  async function markReadDone() {
    const res = await patch({ read_done: true });
    if (res) {
      setProgress(p => ({ ...p, read_done: true }));
      setStep('chat');
    }
  }

  async function markChatDone() {
    const res = await patch({ chat_done: true });
    if (res) {
      setProgress(p => ({ ...p, chat_done: true }));
      setStep('quiz');
      // Refresh page so quiz loads if it was still generating
      router.refresh();
    }
  }

  async function submitQuiz() {
    if (!section.mini_quiz) return;
    const unanswered = section.mini_quiz.filter(q => !quizAnswers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`Please answer all ${section.mini_quiz.length} questions`);
      return;
    }
    const res = await patch({ quiz_answers: quizAnswers });
    if (res) {
      setProgress(p => ({ ...p, quiz_score: res.quiz_score, completed_at: new Date().toISOString() }));
      setQuizResult({ score: res.quiz_score, xp: res.xp_awarded });
      setStep('done');
      if (res.xp_awarded > 0) setXpToast({ xp: res.xp_awarded });
    }
  }

  const currentStepIdx = stepIndex(step);

  const STEPS = [
    { key: 'read', label: 'Read', icon: BookOpen },
    { key: 'chat', label: 'Ask AI', icon: MessageCircle },
    { key: 'quiz', label: 'Quiz', icon: FlaskConical },
    { key: 'done', label: 'Done', icon: CheckCircle2 },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {xpToast && <XpToast xp={xpToast.xp} multiplier={1} onDone={() => setXpToast(null)} />}

      {/* Breadcrumb */}
      <Link
        href={`/chapters/${chapter.id}/sections`}
        className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Sections
      </Link>

      {/* Header */}
      <div>
        <p className="text-xs text-gray-400 mb-1">
          {subjectName} · {chapter.name} · Section {section.order_index + 1} of {section.total_sections}
        </p>
        <h1 className="text-2xl font-bold text-gray-900">{section.title}</h1>
        <p className="text-sm text-gray-500">Estimated: {section.estimated_minutes} min</p>
      </div>

      {/* Step progress bar */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const done = i < currentStepIdx || (s.key === 'done' && step === 'done');
          const active = s.key === step;
          return (
            <div key={s.key} className="flex items-center flex-1">
              <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium flex-1 justify-center transition-all ${
                done ? 'bg-emerald-100 text-emerald-700' :
                active ? 'bg-blue-600 text-white' :
                'bg-gray-100 text-gray-400'
              }`}>
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-3 ${i < currentStepIdx ? 'bg-emerald-300' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Read ── */}
      {step === 'read' && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-blue-700 font-semibold">
              <BookOpen className="h-4 w-4" /> Read this section
            </div>
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto text-sm">
              {section.content_text}
            </div>
            <Button className="w-full" onClick={markReadDone} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              I&apos;ve read this section →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Ask AI ── */}
      {step === 'chat' && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-blue-700 font-semibold">
              <MessageCircle className="h-4 w-4" /> Ask AI anything about this section
            </div>
            <p className="text-sm text-gray-600">
              Have a doubt about <strong>{section.title}</strong>? Ask the AI tutor. It will answer using only this section&apos;s content.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2">
              <p className="text-xs text-blue-600 font-medium">Suggested questions:</p>
              {[
                `Explain ${section.title} in simple words`,
                `Give me a real-life example`,
                `What is the most important formula or rule here?`,
              ].map(q => (
                <Link
                  key={q}
                  href={`/chapters/${chapter.id}/chat?q=${encodeURIComponent(q)}&section=${section.id}`}
                  className="block text-xs text-blue-700 hover:underline"
                >
                  → {q}
                </Link>
              ))}
            </div>
            <div className="flex gap-3">
              <Link
                href={`/chapters/${chapter.id}/chat?section=${section.id}`}
                className="flex-1"
              >
                <Button variant="outline" className="w-full gap-1.5">
                  <MessageCircle className="h-4 w-4" /> Open AI Chat
                </Button>
              </Link>
              <Button className="flex-1" onClick={markChatDone} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Done, take the quiz →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Mini Quiz ── */}
      {step === 'quiz' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 text-blue-700 font-semibold">
              <FlaskConical className="h-4 w-4" /> Test your understanding
            </div>

            {section.quiz_generating || !section.mini_quiz ? (
              <div className="text-center py-8 text-gray-400 space-y-3">
                <RefreshCw className="h-8 w-8 mx-auto animate-spin opacity-40" />
                <p className="text-sm">Quiz is being generated…</p>
                <Button variant="outline" size="sm" onClick={() => router.refresh()}>
                  Refresh
                </Button>
              </div>
            ) : (
              <>
                {section.mini_quiz.map((q, qi) => (
                  <div key={q.id} className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">
                      Q{qi + 1}. {q.question}
                    </p>
                    <div className="space-y-1.5">
                      {q.options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                            quizAnswers[q.id] === opt
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <Button
                  className="w-full"
                  onClick={submitQuiz}
                  disabled={saving || Object.keys(quizAnswers).length < section.mini_quiz.length}
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Submit Answers
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Done ── */}
      {step === 'done' && (
        <Card className="border-emerald-200 bg-emerald-50/60">
          <CardContent className="p-6 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <div>
              <p className="text-xl font-bold text-gray-900">Section Complete!</p>
              {quizResult && (
                <p className="text-sm text-gray-600 mt-1">
                  Quiz score: <span className="font-semibold text-gray-800">{quizResult.score}%</span>
                  {quizResult.score >= 80 && <span className="text-amber-600 ml-2">🌟 Bonus XP awarded!</span>}
                </p>
              )}
              {progress.quiz_score !== null && quizResult === null && (
                <p className="text-sm text-gray-600 mt-1">
                  Quiz score: <span className="font-semibold">{progress.quiz_score}%</span>
                </p>
              )}
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-1">
              {[1, 2, 3].map(i => (
                <Star
                  key={i}
                  className={`h-6 w-6 ${
                    (progress.quiz_score ?? 0) >= i * 33
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-200'
                  }`}
                />
              ))}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {nextSection ? (
                <Link href={`/chapters/${chapter.id}/sections/${nextSection.id}`}>
                  <Button className="w-full gap-1.5">
                    Next: {nextSection.title} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Link href={`/chapters/${chapter.id}/quiz`}>
                  <Button className="w-full gap-1.5 bg-amber-500 hover:bg-amber-600">
                    Take Full Chapter Quiz 🎯
                  </Button>
                </Link>
              )}
              <Link href={`/chapters/${chapter.id}/sections`}>
                <Button variant="outline" className="w-full">Back to Sections</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
