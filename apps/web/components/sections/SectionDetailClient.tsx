'use client';

import { useState, useEffect } from 'react';
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

type Para =
  | { kind: 'body'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'caption'; text: string }
  | { kind: 'definition'; term: string; def: string };

const WORD_SUFFIX_RE = /^(e|ed|er|es|ry|ly|nd|ty|al|ing|ion|ism|ent|ant|ive|ous|ial|tion|ness|ment|ity|ogy|acy|ary|ery|ory)$/;

// Educational section markers that force a paragraph break and become headings.
const SECTION_HEADER_RE = /^(New [Ww]ords?|Activities|Summary|Keywords?|Key [Tt]erms?|Introduction|Conclusion|Note|Did [Yy]ou [Kk]now|Let\s*'?s [Rr]ecall|Questions?|Exercises?)[:.]?\s*$/;

function buildParagraphs(raw: string): string[] {
  const lines = raw
    .replace(/-\n[ \t]*/g, '')                          // "emerg-\ne" → "emerge"
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .filter(l => !/^\d{1,4}$/.test(l))                  // lone page numbers
    .filter(l => !/\breprint\s+\d{4}[-–]\d{2,4}\b/i.test(l)); // "Reprint 2026-27"

  const paragraphs: string[] = [];
  let buffer = '';

  for (const line of lines) {
    // Known section markers force a break and become their own paragraph (heading)
    if (SECTION_HEADER_RE.test(line)) {
      if (buffer) { paragraphs.push(buffer.replace(/\s+/g, ' ').trim()); buffer = ''; }
      paragraphs.push(line.trim());
      continue;
    }

    if (!buffer) { buffer = line; continue; }

    if (/^[a-z]$/.test(line)) { buffer += line; continue; }

    const lastToken = buffer.split(/\s+/).pop() ?? '';
    if (WORD_SUFFIX_RE.test(line) && lastToken.length >= 2 && lastToken.length <= 8 && /[a-z]$/.test(lastToken)) {
      buffer += line;
      continue;
    }

    if (/^[,;]$/.test(line)) { buffer += line; continue; }

    const prevEndsSentence = /[.!?]\s*$/.test(buffer);
    const lineStartsUpper  = /^[A-Z]/.test(line);

    if (prevEndsSentence && lineStartsUpper) {
      paragraphs.push(buffer.replace(/\s+/g, ' ').trim());
      buffer = line;
    } else {
      buffer += ' ' + line;
    }
  }

  if (buffer) paragraphs.push(buffer.replace(/\s+/g, ' ').trim());
  return paragraphs.filter(p => p.length > 1);
}

function cleanText(t: string): string {
  return t
    .replace(/\b([B-HJ-Z]) ([a-z]{2,})/g, '$1$2') // OCR split: "T he" → "The", "Eur ope" → "Europe"
    .replace(/(\w) ([,;:.])/g, '$1$2')              // space before punctuation: "history ," → "history,"
    .replace(/  +/g, ' ')
    .trim();
}

function classify(text: string): Para {
  if (SECTION_HEADER_RE.test(text)) return { kind: 'heading', text };

  // All-caps short line = chapter/section label from PDF
  if (/^[A-Z][A-Z\s]{4,}$/.test(text) && text.length < 80) return { kind: 'heading', text };

  // Figure caption: contains "Fig. N"
  if (/\bFig\.?\s*\d/.test(text)) return { kind: 'caption', text };

  // Glossary definition: "Term – explanation" where term is 1–3 title-case words
  const defMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s*[–—]\s*(.{10,})$/);
  if (defMatch) return { kind: 'definition', term: defMatch[1].trim(), def: defMatch[2].trim() };

  return { kind: 'body', text };
}

function normalisePdfText(raw: string): Para[] {
  return buildParagraphs(raw).map(p => classify(cleanText(p)));
}

function SectionReader({ text }: { text: string }) {
  const paragraphs = normalisePdfText(text);
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 max-h-[32rem] overflow-y-auto space-y-3.5 text-[15px] leading-7 text-gray-800">
      {paragraphs.map((para, i) => {
        if (para.kind === 'heading') {
          return (
            <h3 key={i} className={`font-bold text-gray-900 text-xs tracking-widest uppercase text-emerald-700 ${i > 0 ? 'pt-3 mt-1 border-t border-gray-100' : ''}`}>
              {para.text}
            </h3>
          );
        }
        if (para.kind === 'caption') {
          return (
            <p key={i} className="text-xs italic text-gray-400 text-center bg-gray-50 rounded-lg px-4 py-2 border border-gray-100">
              {para.text}
            </p>
          );
        }
        if (para.kind === 'definition') {
          return (
            <div key={i} className="border-l-4 border-indigo-400 bg-indigo-50 rounded-r-xl px-4 py-2.5">
              <span className="font-bold text-indigo-900 text-sm">{para.term}</span>
              <span className="text-gray-400 mx-1.5 text-sm">—</span>
              <span className="text-gray-700 text-sm leading-relaxed">{para.def}</span>
            </div>
          );
        }
        return <p key={i} className="text-gray-700">{para.text}</p>;
      })}
    </div>
  );
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

  // Auto-poll when quiz step is active and quiz hasn't been generated yet.
  // The page's after() triggers generation; we poll until it appears in the DB.
  useEffect(() => {
    if (step !== 'quiz' || section.mini_quiz) return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [step, section.mini_quiz, router]);
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

      {/* Step progress bar — completed steps are clickable for review */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          // Determine "done" from actual progress, not current step position.
          // This keeps steps green even when navigating back in review mode.
          const doneByProgress =
            s.key === 'read' ? progress.read_done :
            s.key === 'chat' ? progress.chat_done :
            s.key === 'quiz' ? progress.quiz_score !== null :
            !!progress.completed_at;
          const active = s.key === step;
          // Allow clicking back to Read / Ask AI / Quiz when section is complete
          const clickable = !!progress.completed_at && s.key !== 'done' && !active;

          return (
            <div key={s.key} className="flex items-center flex-1">
              <button
                type="button"
                disabled={!clickable}
                onClick={clickable ? () => setStep(s.key as Step) : undefined}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium flex-1 justify-center transition-all ${
                  active         ? 'bg-blue-600 text-white' :
                  doneByProgress ? 'bg-emerald-100 text-emerald-700' :
                                   'bg-gray-100 text-gray-400'
                } ${clickable ? 'hover:bg-emerald-200 cursor-pointer' : 'cursor-default'}`}
              >
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-3 ${doneByProgress ? 'bg-emerald-300' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
      {progress.completed_at && step !== 'done' && (
        <p className="text-xs text-emerald-600 font-medium text-center bg-emerald-50 rounded-lg py-1.5">
          Review mode — tap any step above to navigate
        </p>
      )}

      {/* ── Step 1: Read ── */}
      {step === 'read' && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-blue-700 font-semibold">
              <BookOpen className="h-4 w-4" /> Read this section
            </div>
            <SectionReader text={section.content_text} />
            {progress.completed_at
              ? <Button variant="outline" className="w-full" onClick={() => setStep('done')}>Back to Summary</Button>
              : <Button className="w-full" onClick={markReadDone} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  I&apos;ve read this section →
                </Button>
            }
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
                  href={`/chapters/${chapter.id}/sections/${section.id}/chat?q=${encodeURIComponent(q)}`}
                  className="block text-xs text-blue-700 hover:underline"
                >
                  → {q}
                </Link>
              ))}
            </div>
            <div className="flex gap-3">
              <Link
                href={`/chapters/${chapter.id}/sections/${section.id}/chat`}
                className="flex-1"
              >
                <Button variant="outline" className="w-full gap-1.5">
                  <MessageCircle className="h-4 w-4" /> Open AI Chat
                </Button>
              </Link>
              {progress.completed_at
                ? <Button variant="outline" className="flex-1" onClick={() => setStep('done')}>Back to Summary</Button>
                : <Button className="flex-1" onClick={markChatDone} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Done, take the quiz →
                  </Button>
              }
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
              <div className="text-center py-8 text-gray-400 space-y-2">
                <RefreshCw className="h-8 w-8 mx-auto animate-spin opacity-40" />
                <p className="text-sm font-medium">Generating your quiz…</p>
                <p className="text-xs">This takes about 15 seconds. Page will update automatically.</p>
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
