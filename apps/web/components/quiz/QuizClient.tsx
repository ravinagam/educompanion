'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  FlaskConical, CheckCircle2, XCircle, Trophy,
  RotateCcw, Loader2, ArrowLeft, ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface Question {
  id: string;
  type: 'mcq' | 'true_false' | 'fill_blank';
  question: string;
  options?: string[];
}

interface Quiz {
  id: string;
  chapter_id: string;
  questions_json: Question[];
}

interface Attempt {
  id: string;
  score: number;
  total: number;
  taken_at: string;
}

interface ResultItem {
  questionId: string;
  correct: boolean;
  chosen: string;
  correct_answer: string;
  explanation: string;
}

interface Props {
  chapter: { id: string; name: string; upload_status: string };
  subjectName: string;
  quiz: Quiz | null;
  attempts: Attempt[];
  userId: string;
}

type Phase = 'intro' | 'quiz' | 'review' | 'results';

export function QuizClient({ chapter, subjectName, quiz, attempts }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('intro');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [fillInput, setFillInput] = useState('');
  const [skipped, setSkipped] = useState<string[]>([]); // ordered list of skipped question IDs
  const [readyToSubmit, setReadyToSubmit] = useState(false); // set synchronously when last unanswered Q answered
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [finalScore, setFinalScore] = useState(0);

  const questions = quiz?.questions_json ?? [];
  const currentQ = questions[current];

  // Skipped questions that still have no answer
  const unansweredSkipped = skipped.filter(id => !answers[id]);
  const skipCount = unansweredSkipped.length;
  const isCurrentSkipped = currentQ ? skipped.includes(currentQ.id) : false;

  async function generateQuiz() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/generate/quiz/${chapter.id}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Generation failed');
      } else {
        toast.success('Quiz generated!');
        router.refresh();
      }
    } catch {
      toast.error('Network error. Please check your connection and try again.');
    }
    setGenerating(false);
  }

  function selectAnswer(answer: string) {
    if (!currentQ) return;
    const updatedAnswers = { ...answers, [currentQ.id]: answer };
    setAnswers(updatedAnswers);
    setFillInput(answer);

    // If answering a skipped question, auto-navigate to next unanswered skipped
    if (skipped.includes(currentQ.id)) {
      const nextSkippedId = skipped.find(id => id !== currentQ.id && !updatedAnswers[id]);
      if (nextSkippedId) {
        const idx = questions.findIndex(q => q.id === nextSkippedId);
        if (idx >= 0) {
          setCurrent(idx);
          setFillInput(updatedAnswers[questions[idx]?.id] ?? '');
        }
      } else {
        // No more unanswered skipped — navigate to any other unanswered question, or mark done
        const firstUnanswered = questions.find(q => q.id !== currentQ.id && !updatedAnswers[q.id]);
        if (firstUnanswered) {
          const idx = questions.findIndex(q => q.id === firstUnanswered.id);
          setCurrent(idx);
          setFillInput(updatedAnswers[questions[idx]?.id] ?? '');
        } else {
          setReadyToSubmit(true);
        }
      }
    }
  }

  function next() {
    if (!currentQ) return;
    // Commit fill_blank input to answers
    const updatedAnswers = currentQ.type === 'fill_blank' && fillInput
      ? { ...answers, [currentQ.id]: fillInput }
      : answers;
    if (currentQ.type === 'fill_blank' && fillInput) setAnswers(updatedAnswers);
    setFillInput('');

    // If answering a skipped question, go to next unanswered skipped instead of sequential next
    if (skipped.includes(currentQ.id) && updatedAnswers[currentQ.id]) {
      const nextSkippedId = skipped.find(id => id !== currentQ.id && !updatedAnswers[id]);
      if (nextSkippedId) {
        const idx = questions.findIndex(q => q.id === nextSkippedId);
        if (idx >= 0) { setCurrent(idx); setFillInput(updatedAnswers[questions[idx]?.id] ?? ''); }
      } else {
        // No more unanswered skipped — navigate to any other unanswered question, or mark done
        const firstUnanswered = questions.find(q => q.id !== currentQ.id && !updatedAnswers[q.id]);
        if (firstUnanswered) {
          const idx = questions.findIndex(q => q.id === firstUnanswered.id);
          setCurrent(idx);
          setFillInput(updatedAnswers[questions[idx]?.id] ?? '');
        } else {
          setReadyToSubmit(true);
        }
      }
      return;
    }

    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setFillInput(updatedAnswers[questions[current + 1]?.id] ?? '');
    }
  }

  function prev() {
    if (current > 0) {
      if (currentQ?.type === 'fill_blank' && fillInput) {
        setAnswers(a => ({ ...a, [currentQ.id]: fillInput }));
      }
      setCurrent(c => c - 1);
      setFillInput(answers[questions[current - 1]?.id] ?? '');
    }
  }

  function skip() {
    if (!currentQ) return;
    // Record as skipped (if not already)
    if (!skipped.includes(currentQ.id)) {
      setSkipped(s => [...s, currentQ.id]);
    }
    setFillInput('');

    if (current < questions.length - 1) {
      // Advance to next question
      setCurrent(c => c + 1);
      setFillInput(answers[questions[current + 1]?.id] ?? '');
    } else {
      // At last question — go to first unanswered skipped, or submit
      const nextSkippedId = unansweredSkipped.find(id => id !== currentQ.id);
      if (nextSkippedId) {
        const idx = questions.findIndex(q => q.id === nextSkippedId);
        if (idx >= 0) { setCurrent(idx); setFillInput(answers[questions[idx]?.id] ?? ''); }
      } else {
        submitQuiz();
      }
    }
  }

  function goToFirstSkipped() {
    const firstId = unansweredSkipped[0];
    if (!firstId) return;
    const idx = questions.findIndex(q => q.id === firstId);
    if (idx >= 0) {
      if (currentQ?.type === 'fill_blank' && fillInput) {
        setAnswers(a => ({ ...a, [currentQ.id]: fillInput }));
      }
      setCurrent(idx);
      setFillInput(answers[questions[idx]?.id] ?? '');
    }
  }

  async function submitQuiz() {
    if (currentQ?.type === 'fill_blank') {
      setAnswers(a => ({ ...a, [currentQ.id]: fillInput }));
    }
    const finalAnswers = { ...answers };
    if (currentQ?.type === 'fill_blank') finalAnswers[currentQ.id] = fillInput;

    setSubmitting(true);
    try {
      const res = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: quiz!.id, answers: finalAnswers }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Submission failed');
        setSubmitting(false);
        return;
      }
      setResults(json.data.results);
      setFinalScore(json.data.score);
      setPhase('results');
      router.refresh();
    } catch {
      toast.error('Network error. Please check your connection and try again.');
    }
    setSubmitting(false);
  }

  function restartQuiz() {
    setPhase('intro');
    setCurrent(0);
    setAnswers({});
    setFillInput('');
    setSkipped([]);
    setReadyToSubmit(false);
    setResults([]);
  }

  // Count questions that actually have an answer (no double-counting for fill_blank)
  const answeredCount = questions.filter(q =>
    q.id === currentQ?.id
      ? !!(answers[q.id] || (q.type === 'fill_blank' && fillInput))
      : !!answers[q.id]
  ).length;
  const progressPct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <Link href={`/upload?subject=${encodeURIComponent(subjectName)}`} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3">
            <ArrowLeft className="h-3 w-3" /> Back to Chapters
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{subjectName} - {chapter.name}</h1>
          <h2 className="text-xl font-bold text-gray-700">Quiz</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-5 w-5 text-blue-500" />
              Chapter Quiz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!quiz ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-gray-500">No quiz generated yet for this chapter.</p>
                {chapter.upload_status !== 'ready' ? (
                  <p className="text-sm text-amber-600">Chapter is still processing. Please wait.</p>
                ) : (
                  <Button onClick={generateQuiz} disabled={generating}>
                    {generating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</> : 'Generate Quiz with AI'}
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-blue-700">{questions.length}</p>
                    <p className="text-xs text-gray-500">Questions</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-purple-700">
                      {questions.filter(q => q.type === 'mcq').length}
                    </p>
                    <p className="text-xs text-gray-500">MCQ</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-green-700">{attempts.length}</p>
                    <p className="text-xs text-gray-500">Attempts</p>
                  </div>
                </div>

                {attempts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Recent Attempts</p>
                    {attempts.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {new Date(a.taken_at).toLocaleDateString('en-IN')}{' '}
                          {new Date(a.taken_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Badge variant={
                          Math.round(a.score / a.total * 100) >= 70 ? 'default' :
                          Math.round(a.score / a.total * 100) >= 50 ? 'secondary' : 'destructive'
                        }>
                          {a.score}/{a.total} ({Math.round(a.score / a.total * 100)}%)
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={generateQuiz} variant="outline" disabled={generating} className="flex-1">
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                    Regenerate
                  </Button>
                  <Button onClick={() => setPhase('quiz')} className="flex-1">
                    Start Quiz →
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Quiz ───────────────────────────────────────────────────────────────────
  if (phase === 'quiz' && currentQ) {
    // Current question has an answer (fill_blank uses live input before it's saved)
    const answered = !!(answers[currentQ.id] || (currentQ.type === 'fill_blank' && fillInput));

    // Every question has an answer — gates Submit enabled state
    const allAnswered = questions.length > 0 && questions.every(q =>
      q.id === currentQ.id
        ? !!(answers[q.id] || (q.type === 'fill_blank' && fillInput))
        : !!answers[q.id]
    );

    // Questions other than the current one that have no committed answer
    const otherUnanswered = questions.filter(q => q.id !== currentQ.id && !answers[q.id]).length;

    const isLast = current === questions.length - 1;
    // Show Submit+Review when: on last Q, all done, flag set, OR this is the only question left
    const showSubmit = isLast || allAnswered || readyToSubmit || otherUnanswered === 0;

    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div>
          <Link href={`/upload?subject=${encodeURIComponent(subjectName)}`} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3">
            <ArrowLeft className="h-3 w-3" /> Back to Chapters
          </Link>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{subjectName} - {chapter.name}</h1>
              <h2 className="text-xl font-bold text-gray-700">Quiz</h2>
            </div>
            <p className="text-sm text-gray-500 mb-0.5">
              Answered {answeredCount} / {questions.length}
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <Progress value={progressPct} className="h-1.5" />
          {skipCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-amber-600 font-medium">{skipCount} skipped</span>
              <span className="text-xs text-gray-300">•</span>
              <button
                onClick={goToFirstSkipped}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium underline underline-offset-2"
              >
                Review skipped →
              </button>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {currentQ.type === 'mcq' ? 'Multiple Choice' :
                   currentQ.type === 'true_false' ? 'True / False' : 'Fill in the Blank'}
                </Badge>
                {isCurrentSkipped && (
                  <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                    Skipped — answer to clear
                  </Badge>
                )}
              </div>
              <p className="text-lg font-medium text-gray-900 leading-snug">{currentQ.question}</p>
            </div>

            {/* MCQ + True/False options */}
            {currentQ.options && (
              <div className="space-y-2">
                {currentQ.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => selectAnswer(opt)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors font-medium ${
                      answers[currentQ.id] === opt
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Fill in the blank */}
            {currentQ.type === 'fill_blank' && (
              <input
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type your answer..."
                value={fillInput}
                onChange={e => setFillInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isLast && next()}
              />
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={prev} disabled={current === 0}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={skip}
                disabled={submitting}
                className="text-gray-400 hover:text-gray-600"
              >
                Skip{skipCount > 0 ? ` (${skipCount})` : ''}
              </Button>
              <div className="flex-1" />
              {showSubmit ? (
                <>
                  <Button variant="outline" onClick={() => {
                    if (currentQ?.type === 'fill_blank' && fillInput) {
                      setAnswers(a => ({ ...a, [currentQ.id]: fillInput }));
                    }
                    setPhase('review');
                  }} disabled={submitting}>
                    Review Answers
                  </Button>
                  <Button
                    onClick={submitQuiz}
                    disabled={submitting || (!allAnswered && !readyToSubmit)}
                  >
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting</> : 'Submit Quiz'}
                  </Button>
                </>
              ) : (
                <Button onClick={next} disabled={!answered}>
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Review ─────────────────────────────────────────────────────────────────
  if (phase === 'review') {
    const allReviewAnswered = questions.every(q => !!answers[q.id]);

    return (
      <div className="space-y-5 max-w-2xl mx-auto">
        <div>
          <Link href={`/upload?subject=${encodeURIComponent(subjectName)}`} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3">
            <ArrowLeft className="h-3 w-3" /> Back to Chapters
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{subjectName} - {chapter.name}</h1>
          <h2 className="text-xl font-bold text-gray-700">Review Answers</h2>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setPhase('quiz')} className="flex-1">
            ← Back to Quiz
          </Button>
          <Button onClick={submitQuiz} disabled={submitting || !allReviewAnswered} className="flex-1">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting</> : 'Submit Quiz'}
          </Button>
        </div>

        <div className="space-y-3">
          {questions.map((q, idx) => (
            <Card key={q.id} className={answers[q.id] ? '' : 'border-amber-200 bg-amber-50'}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-gray-400 mt-0.5 shrink-0">Q{idx + 1}</span>
                  <div className="flex-1 space-y-3">
                    <p className="text-sm font-medium text-gray-900 leading-snug">{q.question}</p>

                    {/* MCQ / True-False: clickable options */}
                    {q.options && (
                      <div className="space-y-1.5">
                        {q.options.map(opt => (
                          <button
                            key={opt}
                            onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                            className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                              answers[q.id] === opt
                                ? 'border-blue-500 bg-blue-50 text-blue-800 font-semibold'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Fill in the blank: editable input */}
                    {q.type === 'fill_blank' && (
                      <input
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Your answer..."
                        value={answers[q.id] ?? ''}
                        onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                      />
                    )}

                    {!answers[q.id] && (
                      <p className="text-xs text-amber-600 font-medium">Not answered yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button onClick={submitQuiz} disabled={submitting || !allReviewAnswered} className="w-full">
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting</> : 'Submit Quiz'}
        </Button>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  if (phase === 'results') {
    const pct = Math.round((finalScore / questions.length) * 100);

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <button onClick={() => setPhase('intro')} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3">
            <ArrowLeft className="h-3 w-3" /> Back to Quiz Summary
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{subjectName} - {chapter.name}</h1>
          <h2 className="text-xl font-bold text-gray-700">Quiz</h2>
        </div>
        <Card className={`border-2 ${pct >= 70 ? 'border-green-300 bg-green-50' : pct >= 50 ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50'}`}>
          <CardContent className="p-6 text-center space-y-3">
            <Trophy className={`h-12 w-12 mx-auto ${pct >= 70 ? 'text-green-500' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`} />
            <div>
              <p className="text-4xl font-bold text-gray-900">{pct}%</p>
              <p className="text-gray-600">{finalScore} / {questions.length} correct</p>
            </div>
            <p className="font-medium">
              {pct >= 80 ? 'Excellent! Great work!' :
               pct >= 60 ? 'Good effort! Review the wrong ones.' :
               'Keep practicing — you\'ll get there!'}
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setPhase('intro')} className="flex-1">
                View Summary
              </Button>
              <Button variant="outline" onClick={restartQuiz} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />Retry
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">Answer Review</h2>
          {results.map((r, i) => {
            const q = questions.find(q => q.id === r.questionId);
            return (
              <Card key={r.questionId} className={`border ${r.correct ? 'border-green-200' : 'border-red-200'}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    {r.correct
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      : <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    }
                    <p className="text-sm font-medium text-gray-900">Q{i + 1}. {q?.question}</p>
                  </div>
                  {!r.correct && (
                    <div className="ml-6 space-y-1">
                      <p className="text-xs text-red-600">Your answer: {r.chosen || '(blank)'}</p>
                      <p className="text-xs text-green-700 font-medium">Correct: {r.correct_answer}</p>
                    </div>
                  )}
                  <p className="ml-6 text-xs text-gray-500 italic">{r.explanation}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
