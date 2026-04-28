'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Layers, RotateCcw, ThumbsUp, ThumbsDown,
  Loader2, ArrowLeft, Check, RefreshCw, CheckCircle2
} from 'lucide-react';

interface FlashcardProgress {
  id: string;
  status: 'known' | 'unknown';
  next_review_at: string;
  review_count: number;
}

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  progress: FlashcardProgress | null;
}

interface Props {
  chapter: { id: string; name: string; upload_status: string };
  subjectName: string;
  flashcards: Flashcard[];
  mastery: number;
  userId: string;
}

export function FlashcardsClient({ chapter, subjectName, flashcards: initialCards, mastery: initialMastery }: Props) {
  const router = useRouter();
  const [flashcards, setFlashcards] = useState(initialCards);

  // Sync when router.refresh() delivers new initialCards after generation
  useEffect(() => {
    if (flashcards.length === 0 && initialCards.length > 0) {
      setFlashcards(initialCards);
    }
  }, [initialCards]); // eslint-disable-line react-hooks/exhaustive-deps
  const [mastery, setMastery] = useState(initialMastery);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'all' | 'due' | 'unknown'>('due');
  const [sessionDone, setSessionDone] = useState(false);

  const now = new Date();
  const dueCards = flashcards.filter(f =>
    !f.progress || new Date(f.progress.next_review_at) <= now
  );

  const displayCards =
    mode === 'due' ? dueCards :
    mode === 'unknown' ? flashcards.filter(f => !f.progress || f.progress.status === 'unknown') :
    // 'all': due cards first, then the rest
    [...dueCards, ...flashcards.filter(f => f.progress && new Date(f.progress.next_review_at) > now)];

  const currentCard = displayCards[current];

  async function generateFlashcards() {
    setGenerating(true);
    const res = await fetch(`/api/generate/flashcards/${chapter.id}`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? 'Generation failed');
    } else {
      toast.success('Flashcards generated!');
      router.refresh();
    }
    setGenerating(false);
  }

  async function markCard(status: 'known' | 'unknown') {
    if (!currentCard || submitting) return;
    setSubmitting(true);

    const res = await fetch('/api/flashcard-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flashcardId: currentCard.id, status }),
    });

    if (res.ok) {
      const json = await res.json();
      setFlashcards(cards => cards.map(c =>
        c.id === currentCard.id ? { ...c, progress: json.data } : c
      ));

      // Recompute mastery
      const updatedCards = flashcards.map(c =>
        c.id === currentCard.id ? { ...c, progress: json.data } : c
      );
      const knownCount = updatedCards.filter(c => c.progress?.status === 'known').length;
      setMastery(Math.round((knownCount / flashcards.length) * 100));
    }

    setFlipped(false);

    const next = current + 1;
    if (next >= displayCards.length) {
      setSessionDone(true);
    } else {
      setCurrent(next);
    }
    setSubmitting(false);
  }

  function restart() {
    setCurrent(0);
    setFlipped(false);
    setSessionDone(false);
  }

  const knownCount = flashcards.filter(f => f.progress?.status === 'known').length;

  // Intro / empty state
  if (flashcards.length === 0) {
    return (
      <div className="space-y-6 max-w-xl mx-auto">
        <div>
          <Link href={`/chapters?subject=${encodeURIComponent(subjectName)}`} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3">
            <ArrowLeft className="h-3 w-3" /> Back to Chapters
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{subjectName} - {chapter.name}</h1>
          <h2 className="text-xl font-bold text-gray-700">Flashcards</h2>
        </div>
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Layers className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="text-gray-500">No flashcards generated yet.</p>
            {chapter.upload_status !== 'ready' ? (
              <p className="text-sm text-amber-600">Chapter is still processing.</p>
            ) : (
              <Button onClick={generateFlashcards} disabled={generating}>
                {generating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</> : 'Generate Flashcards with AI'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session done
  if (sessionDone) {
    return (
      <div className="space-y-6 max-w-xl mx-auto">
        <div>
          <Link href={`/chapters?subject=${encodeURIComponent(subjectName)}`} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> Back to Chapters
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{subjectName} - {chapter.name}</h1>
          <h2 className="text-xl font-bold text-gray-700">Flashcards</h2>
        </div>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center space-y-4">
            <Check className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <p className="text-2xl font-bold text-gray-900">Session Complete!</p>
              <p className="text-gray-600">You reviewed {displayCards.length} cards</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Chapter Mastery</p>
              <p className="text-3xl font-bold text-blue-600">{mastery}%</p>
              <Progress value={mastery} className="h-2 mt-2" />
              <p className="text-xs text-gray-400 mt-1">{knownCount} / {flashcards.length} mastered</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={restart} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />Restart
              </Button>
              <Button
                className="flex-1"
                onClick={() => { setMode('unknown'); setCurrent(0); setFlipped(false); setSessionDone(false); }}
                disabled={!flashcards.some(f => !f.progress || f.progress.status === 'unknown')}
              >
                Study Missed Cards
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Study mode
  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/chapters?subject=${encodeURIComponent(subjectName)}`} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3 w-3" /> Back to Chapters
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{subjectName} - {chapter.name}</h1>
          <h2 className="text-xl font-bold text-gray-700">Flashcards</h2>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-blue-700">{mastery}% mastered</p>
          <p className="text-xs text-gray-400">{current + 1} / {displayCards.length}</p>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <Progress value={mastery} className="flex-1 h-1.5" />
        <Button
          size="sm"
          variant="ghost"
          onClick={generateFlashcards}
          disabled={generating}
          className="h-7 text-xs gap-1"
        >
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Regenerate
        </Button>
      </div>

      {/* Mode switcher */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={mode === 'due' ? 'default' : 'outline'}
          onClick={() => { setMode('due'); setCurrent(0); setFlipped(false); }}
          className={mode === 'due' ? 'bg-amber-500 hover:bg-amber-600 border-amber-500' : 'border-amber-200 text-amber-700 hover:bg-amber-50'}
        >
          Due Now ({dueCards.length})
        </Button>
        <Button size="sm" variant={mode === 'all' ? 'default' : 'outline'} onClick={() => { setMode('all'); setCurrent(0); setFlipped(false); }}>
          All ({flashcards.length})
        </Button>
        <Button size="sm" variant={mode === 'unknown' ? 'default' : 'outline'} onClick={() => { setMode('unknown'); setCurrent(0); setFlipped(false); }}>
          Missed ({flashcards.filter(f => !f.progress || f.progress.status === 'unknown').length})
        </Button>
      </div>

      {/* No cards in this mode */}
      {!currentCard && mode === 'due' && (
        <div className="text-center py-10 bg-amber-50 rounded-2xl border border-amber-100">
          <CheckCircle2 className="h-10 w-10 text-amber-400 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">All caught up!</p>
          <p className="text-sm text-gray-500 mt-1">No cards due for review right now.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => { setMode('all'); setCurrent(0); setFlipped(false); }}>
            Study All Cards
          </Button>
        </div>
      )}

      {/* Flashcard */}
      {currentCard && (
        <div
          className="relative cursor-pointer select-none"
          style={{ perspective: '1000px' }}
          onClick={() => setFlipped(f => !f)}
        >
          <div
            style={{
              transition: 'transform 0.4s',
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              minHeight: '280px',
              position: 'relative',
            }}
          >
            {/* Front */}
            <div
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8"
            >
              <Badge variant="outline" className="mb-4 text-xs">Term</Badge>
              <p className="text-2xl font-bold text-center text-gray-900">{currentCard.term}</p>
              <p className="text-sm text-gray-400 mt-4">Tap to reveal definition</p>
            </div>

            {/* Back */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-8"
            >
              <Badge variant="outline" className="mb-4 text-xs">Definition</Badge>
              <p className="text-lg text-center text-gray-900 leading-relaxed">{currentCard.definition}</p>
              {currentCard.progress?.review_count ? (
                <p className="text-xs text-gray-400 mt-4">Reviewed {currentCard.progress.review_count}×</p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons — only show after flip */}
      {flipped && (
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-red-500 hover:bg-red-600 text-white gap-2"
            onClick={() => markCard('unknown')}
            disabled={submitting}
          >
            <ThumbsDown className="h-4 w-4" />
            Don&apos;t Know
          </Button>
          <Button
            className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2"
            onClick={() => markCard('known')}
            disabled={submitting}
          >
            <ThumbsUp className="h-4 w-4" />
            Got It!
          </Button>
        </div>
      )}

      {!flipped && (
        <p className="text-center text-xs text-gray-400">Tap the card to flip it, then rate your confidence</p>
      )}
    </div>
  );
}
