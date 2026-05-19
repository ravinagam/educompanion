'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, BookOpen, MessageCircle,
  FlaskConical, CheckCircle2, Loader2, Star, RefreshCw, Printer,
} from 'lucide-react';
import { XpToast } from '@/components/gamification/XpToast';
import { normalisePdfText, hasMathGarble, type Para } from '@/lib/utils/section-text';
import { hasMathDelimiters } from '@/lib/utils/pdf-vision-extract';
import { MathText } from '@/components/sections/MathText';

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

interface ChapterImage {
  id: string;
  image_url: string;
  page_num: number;
  order_idx: number;
  width: number | null;
  height: number | null;
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
  chapterImages?: ChapterImage[];
}

type Step = 'read' | 'chat' | 'quiz' | 'done';

function stepIndex(step: Step) {
  return { read: 0, chat: 1, quiz: 2, done: 3 }[step];
}


function renderText(text: string, className?: string) {
  // If the text contains LaTeX delimiters ($...$) from Claude vision extraction,
  // render through KaTeX. Otherwise render as plain text.
  if (hasMathDelimiters(text)) {
    return <MathText text={text} className={className} />;
  }
  return <span className={className}>{text}</span>;
}

function renderPara(para: ReturnType<typeof normalisePdfText>[number], key: string, isFirst: boolean) {
  if (para.kind === 'heading') {
    return (
      <h3 key={key} className={`font-bold text-xs tracking-widest uppercase text-emerald-700 ${!isFirst ? 'pt-3 mt-1 border-t border-gray-100' : ''}`}>
        {para.text}
      </h3>
    );
  }
  if (para.kind === 'caption') {
    return (
      <p key={key} className="text-xs italic text-gray-400 text-center bg-gray-50 rounded-lg px-4 py-2 border border-gray-100">
        {renderText(para.text)}
      </p>
    );
  }
  if (para.kind === 'definition') {
    return (
      <div key={key} className="border-l-4 border-indigo-400 bg-indigo-50 rounded-r-xl px-4 py-2.5">
        <span className="font-bold text-indigo-900 text-sm">{para.term}</span>
        <span className="text-gray-400 mx-1.5 text-sm">—</span>
        {renderText(para.def, 'text-gray-700 text-sm leading-relaxed')}
      </div>
    );
  }
  return (
    <p key={key} className="text-gray-700">
      {renderText(para.text)}
    </p>
  );
}

const FIGURE_MARKER_RE = /\[\[FIGURE:(\d+)_(\d+)\]\]\n?/g;

function SectionReader({ text, chapterImages }: { text: string; chapterImages: ChapterImage[] }) {
  const hasGarble = hasMathGarble(text);
  const hasMath = hasMathDelimiters(text);

  // Split text at [[FIGURE:X_Y]] markers to render inline images
  type Segment = { type: 'text'; content: string } | { type: 'figure'; pageNum: number; orderIdx: number };
  const segments: Segment[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  FIGURE_MARKER_RE.lastIndex = 0;
  while ((m = FIGURE_MARKER_RE.exec(text)) !== null) {
    const before = text.slice(lastIndex, m.index);
    if (before.trim()) segments.push({ type: 'text', content: before });
    segments.push({ type: 'figure', pageNum: parseInt(m[1]), orderIdx: parseInt(m[2]) });
    lastIndex = m.index + m[0].length;
  }
  const tail = text.slice(lastIndex);
  if (tail.trim()) segments.push({ type: 'text', content: tail });
  if (segments.length === 0) segments.push({ type: 'text', content: text });

  return (
    <div className="space-y-3">
      {hasGarble && !hasMath && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 text-xs text-amber-800">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span>
            This section contains <strong>mathematical formulas</strong> that could not be decoded from the PDF font.
            {' '}<strong>Re-upload this chapter as a PDF</strong> to get properly rendered formulas, or refer to your textbook.
          </span>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 max-h-[32rem] md:max-h-none overflow-y-auto md:overflow-visible space-y-3.5 text-[15px] leading-7 text-gray-800">
        {segments.map((seg, si) => {
          if (seg.type === 'figure') {
            const img = chapterImages.find(ci => ci.page_num === seg.pageNum && ci.order_idx === seg.orderIdx);
            if (!img) return null;
            return (
              <div key={`fig-${si}`} className="rounded-lg overflow-hidden border border-gray-100 shadow-sm bg-gray-50 my-2">
                <Image
                  src={img.image_url}
                  alt="Chapter figure"
                  width={img.width ?? 600}
                  height={img.height ?? 400}
                  className="w-full h-auto object-contain"
                  unoptimized
                />
              </div>
            );
          }
          const paras = normalisePdfText(seg.content);
          return paras.map((para, pi) => renderPara(para, `${si}-${pi}`, si === 0 && pi === 0));
        })}
      </div>
    </div>
  );
}

export function SectionDetailClient({ chapter, subjectName, section, progress: initialProgress, nextSection, chapterImages = [] }: Props) {
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

  function printQuiz() {
    if (!section.mini_quiz) return;
    const LABELS = ['A', 'B', 'C', 'D', 'E'];
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const questionsHtml = section.mini_quiz.map((q, qi) => {
      const options = q.options.map((opt, oi) =>
        `<div class="option"><span class="label">${LABELS[oi] ?? oi + 1}.</span> ${opt}</div>`
      ).join('');
      return `
        <div class="question">
          <p class="qtext"><span class="qnum">Q${qi + 1}.</span> ${q.question}</p>
          <div class="options">${options}</div>
          <div class="answer-line">Answer: _____________</div>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Quiz — ${section.title}</title>
<style>
  @page { margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 48px 44px 40px; }
  .header { border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 20px; }
  .header h1 { font-size: 17px; font-weight: bold; }
  .header .meta { font-size: 11px; color: #555; margin-top: 4px; }
  .question { margin-bottom: 22px; page-break-inside: avoid; }
  .qtext { font-weight: 600; margin-bottom: 8px; line-height: 1.5; }
  .qnum { margin-right: 4px; }
  .options { margin-left: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
  .option { display: flex; gap: 6px; line-height: 1.5; }
  .label { font-weight: 600; min-width: 18px; }
  .answer-line { margin-top: 8px; font-size: 12px; color: #444; }
</style>
</head>
<body>
<div class="header">
  <h1>${section.title}</h1>
  <div class="meta">${subjectName} &nbsp;·&nbsp; ${chapter.name} &nbsp;·&nbsp; ${date}</div>
</div>
${questionsHtml}
</body>
</html>`;

    const w = window.open('', '_blank', 'width=800,height=700');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  async function submitQuiz() {
    if (!section.mini_quiz) return;
    const unanswered = section.mini_quiz.filter((_, i) => !quizAnswers[i]);
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
    <div className="max-w-2xl md:max-w-4xl mx-auto space-y-5">
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
            {/* Images render inline at [[FIGURE:X_Y]] markers in the section text */}
            <SectionReader text={section.content_text} chapterImages={chapterImages} />
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700 font-semibold">
                <FlaskConical className="h-4 w-4" /> Test your understanding
              </div>
              {section.mini_quiz && (
                <button
                  type="button"
                  onClick={printQuiz}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
              )}
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
                  <div key={qi} className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">
                      Q{qi + 1}. {renderText(q.question)}
                    </p>
                    <div className="space-y-1.5">
                      {q.options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => setQuizAnswers(prev => ({ ...prev, [qi]: opt }))}
                          className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                            quizAnswers[qi] === opt
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          {renderText(opt)}
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
