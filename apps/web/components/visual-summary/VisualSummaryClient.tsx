'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, ArrowRight, Volume2, VolumeX, Play, Pause,
  Loader2, Sparkles, RefreshCw,
} from 'lucide-react';
import type {
  VisualCard, CoverCard, ConceptCard, TimelineCard, RememberCard, MindMapCard,
} from '@/lib/ai/visual-summary';

interface Props {
  chapter: { id: string; name: string; upload_status: string };
  subjectName: string;
}

// ─── Gradient palettes per card index (cycles) ────────────────────────────────
const GRADIENTS = [
  'from-blue-600 via-indigo-600 to-violet-700',
  'from-violet-600 via-purple-600 to-pink-600',
  'from-emerald-600 via-teal-600 to-cyan-600',
  'from-amber-500 via-orange-500 to-red-500',
  'from-rose-600 via-pink-600 to-fuchsia-600',
  'from-cyan-600 via-blue-600 to-indigo-700',
  'from-green-600 via-emerald-600 to-teal-600',
  'from-indigo-600 via-violet-600 to-purple-600',
  'from-orange-500 via-amber-500 to-yellow-500',
];

// ─── TTS helpers ──────────────────────────────────────────────────────────────
function cardNarration(card: VisualCard): string {
  switch (card.type) {
    case 'cover':
      return `${card.headline}. ${card.tagline}`;
    case 'concept':
      return `${card.title}. ${card.body}. Key term: ${card.highlight}.`;
    case 'timeline':
      return `${card.title}. ` + card.events.map(e => `${e.year}: ${e.event}`).join('. ');
    case 'remember':
      return `${card.title}. ` + card.points.join('. ');
    case 'mindmap':
      return `${card.center} connects to: ` + card.branches.join(', ');
  }
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.92;
  u.pitch = 1.05;
  window.speechSynthesis.speak(u);
}

function stopSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// ─── Individual card renderers ─────────────────────────────────────────────────
function CoverSlide({ card, gradient }: { card: CoverCard; gradient: string }) {
  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center text-center px-8 gap-4`}>
      <div className="text-7xl drop-shadow-lg">{card.emoji}</div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight drop-shadow-md">
        {card.headline}
      </h1>
      <p className="text-base sm:text-lg text-white/80 font-medium">{card.tagline}</p>
    </div>
  );
}

function ConceptSlide({ card, gradient }: { card: ConceptCard; gradient: string }) {
  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col justify-between px-6 py-7`}>
      <div>
        <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-2">Concept</p>
        <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">{card.title}</h2>
      </div>
      <p className="text-sm sm:text-base text-white/90 leading-relaxed flex-1 mt-4">{card.body}</p>
      <div className="mt-4 rounded-xl bg-white/15 border border-white/25 px-4 py-3">
        <p className="text-xs text-white/60 mb-1 font-semibold uppercase tracking-wide">Key Term</p>
        <p className="text-white font-bold text-base">{card.highlight}</p>
      </div>
    </div>
  );
}

function TimelineSlide({ card, gradient }: { card: TimelineCard; gradient: string }) {
  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col px-6 py-7`}>
      <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">Timeline</p>
      <h2 className="text-xl font-bold text-white mb-4">{card.title}</h2>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {card.events.map((ev, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="shrink-0 rounded-lg bg-white/20 border border-white/30 px-2.5 py-1 text-xs font-bold text-white min-w-[60px] text-center">
              {ev.year}
            </div>
            <p className="text-white/90 text-sm leading-snug pt-0.5">{ev.event}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RememberSlide({ card, gradient }: { card: RememberCard; gradient: string }) {
  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col px-6 py-7`}>
      <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">Must Remember</p>
      <h2 className="text-xl font-bold text-white mb-4">{card.title}</h2>
      <ul className="flex-1 space-y-3 overflow-y-auto">
        {card.points.map((pt, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span className="shrink-0 h-6 w-6 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <p className="text-white/90 text-sm leading-snug pt-0.5">{pt}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MindMapSlide({ card, gradient }: { card: MindMapCard; gradient: string }) {
  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center px-6 py-7 gap-5`}>
      <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Chapter Map</p>
      <div className="rounded-2xl bg-white/20 border-2 border-white/40 px-6 py-3 text-center">
        <p className="text-white font-extrabold text-lg">{card.center}</p>
      </div>
      <div className="w-full grid grid-cols-2 gap-2">
        {card.branches.map((br, i) => (
          <div key={i} className="rounded-xl bg-white/15 border border-white/25 px-3 py-2 text-center">
            <p className="text-white text-sm font-semibold leading-snug">{br}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardSlide({ card, index }: { card: VisualCard; index: number }) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  switch (card.type) {
    case 'cover':    return <CoverSlide    card={card} gradient={gradient} />;
    case 'concept':  return <ConceptSlide  card={card} gradient={gradient} />;
    case 'timeline': return <TimelineSlide card={card} gradient={gradient} />;
    case 'remember': return <RememberSlide card={card} gradient={gradient} />;
    case 'mindmap':  return <MindMapSlide  card={card} gradient={gradient} />;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export function VisualSummaryClient({ chapter, subjectName }: Props) {
  const [cards, setCards] = useState<VisualCard[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [audioOn, setAudioOn] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cacheKey = `vs_${chapter.id}`;

  useEffect(() => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try { setCards(JSON.parse(cached)); return; } catch { /* ignore */ }
    }
    generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chapters/${chapter.id}/visual-summary`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to generate'); return; }
      const newCards: VisualCard[] = json.summary.cards;
      localStorage.setItem(cacheKey, JSON.stringify(newCards));
      setCards(newCards);
      setIdx(0);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const goTo = useCallback((i: number) => {
    if (!cards) return;
    const next = Math.max(0, Math.min(i, cards.length - 1));
    setIdx(next);
    if (audioOn) speak(cardNarration(cards[next]));
  }, [cards, audioOn]);

  const prev = () => goTo(idx - 1);
  const next = () => goTo(idx + 1);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Auto-play
  useEffect(() => {
    if (!autoPlay || !cards) { if (timerRef.current) clearTimeout(timerRef.current); return; }
    timerRef.current = setTimeout(() => {
      if (idx < cards.length - 1) goTo(idx + 1);
      else setAutoPlay(false);
    }, 6000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [autoPlay, idx, cards, goTo]);

  // Audio toggle
  function toggleAudio() {
    const next = !audioOn;
    setAudioOn(next);
    if (next && cards) speak(cardNarration(cards[idx]));
    else stopSpeech();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg">
          <Sparkles className="h-8 w-8 text-white animate-pulse" />
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-800">Generating Visual Summary…</p>
          <p className="text-sm text-gray-400 mt-1">AI is creating study cards for this chapter</p>
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <p className="text-red-500 font-semibold">{error}</p>
        <Button onClick={generate} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  if (!cards) return null;

  const card = cards[idx];

  return (
    <div className="max-w-md mx-auto space-y-4 select-none">
      {/* Back link */}
      <Link
        href="/chapters"
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        {subjectName} — {chapter.name}
      </Link>

      {/* Preview badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold px-2.5 py-1 border border-violet-200">
          <Sparkles className="h-3 w-3" /> Video v2 Preview
        </span>
        <span className="text-xs text-gray-400">{idx + 1} / {cards.length}</span>
      </div>

      {/* Card */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{ aspectRatio: '9/16', maxHeight: '72vh' }}
      >
        <CardSlide card={card} index={idx} />

        {/* Prev / Next tap zones */}
        <button
          onClick={prev}
          disabled={idx === 0}
          className="absolute inset-y-0 left-0 w-1/3 opacity-0"
          aria-label="Previous"
        />
        <button
          onClick={next}
          disabled={idx === cards.length - 1}
          className="absolute inset-y-0 right-0 w-1/3 opacity-0"
          aria-label="Next"
        />
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? 'w-6 bg-violet-600' : 'w-1.5 bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={prev} disabled={idx === 0} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Prev
          </Button>
          <Button size="sm" variant="outline" onClick={next} disabled={idx === cards.length - 1} className="gap-1.5">
            Next <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAutoPlay(p => !p)}
            className="gap-1.5"
          >
            {autoPlay ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {autoPlay ? 'Pause' : 'Auto'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={toggleAudio}
            className={`gap-1.5 ${audioOn ? 'border-violet-300 text-violet-700 bg-violet-50' : ''}`}
          >
            {audioOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {audioOn ? 'Audio On' : 'Audio'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { localStorage.removeItem(cacheKey); generate(); }} className="gap-1.5 text-gray-400">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
