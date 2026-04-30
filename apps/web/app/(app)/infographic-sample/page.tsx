'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Play, Pause, Sparkles, BookOpen, Clock, Star, Brain, Volume2, VolumeX } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type CoverCard    = { type: 'cover'; bg: string };
type ConceptCard  = { type: 'concept'; bg: string; title: string; emoji: string; definition: string; example: string };
type TimelineCard = { type: 'timeline'; bg: string; events: { year: string; event: string }[] };
type RememberCard = { type: 'remember'; bg: string; facts: string[] };
type MindMapCard  = { type: 'mindmap'; bg: string; center: string; branches: { label: string; labelColor: string; items: string[] }[] };
type AnyCard = CoverCard | ConceptCard | TimelineCard | RememberCard | MindMapCard;

// ── Sample data (French Revolution — NCERT History Class 9) ───────────────────

const CHAPTER_NAME = 'The French Revolution';
const SUBJECT = 'History · Class 9';

const CARDS: AnyCard[] = [
  {
    type: 'cover',
    bg: 'from-blue-700 via-blue-800 to-slate-900',
  },
  {
    type: 'concept',
    bg: 'from-blue-500 to-blue-700',
    title: 'The Three Estates',
    emoji: '🏛️',
    definition:
      'French society was divided into three Estates. The First (Clergy) and Second (Nobility) paid no taxes. The Third Estate — 97 % of the population — bore the entire tax burden, fuelling deep resentment.',
    example:
      'A peasant toiling all year while a nobleman owned the land tax-free → the tipping point for revolution.',
  },
  {
    type: 'concept',
    bg: 'from-violet-500 to-purple-700',
    title: 'Liberty, Equality, Fraternity',
    emoji: '🗽',
    definition:
      'France\'s revolutionary motto. Liberty = freedom from tyranny. Equality = same rights regardless of birth. Fraternity = brotherhood and national unity.',
    example:
      'These ideals spread worldwide and still appear on French coins and government buildings today.',
  },
  {
    type: 'concept',
    bg: 'from-rose-500 to-red-700',
    title: 'Reign of Terror (1793–94)',
    emoji: '⚔️',
    definition:
      'Robespierre\'s radical phase where 16,000+ people were guillotined in the name of "protecting the revolution" — including King Louis XVI and Queen Marie Antoinette.',
    example:
      '"The revolution devours its own children" — Robespierre himself was guillotined in July 1794.',
  },
  {
    type: 'timeline',
    bg: 'from-indigo-600 to-purple-800',
    events: [
      { year: '1789', event: 'Storming of the Bastille · Birth of France\'s National Day (14 July)' },
      { year: '1791', event: 'Constitutional Monarchy established · King\'s powers limited' },
      { year: '1792', event: 'French Republic declared · Louis XVI arrested' },
      { year: '1793', event: 'Reign of Terror begins · King executed by guillotine' },
      { year: '1799', event: 'Napoleon seizes power as First Consul · Revolution ends' },
    ],
  },
  {
    type: 'remember',
    bg: 'from-amber-400 to-orange-500',
    facts: [
      'Revolution lasted 1789–1799 (exactly 10 years)',
      '14 July = Bastille Day — France\'s National Holiday',
      'Motto: "Liberté, Égalité, Fraternité"',
      'Tennis Court Oath was taken on 20 June 1789',
      'Napoleon ended the Revolution as First Consul in 1799',
    ],
  },
  {
    type: 'mindmap',
    bg: 'from-emerald-500 to-teal-700',
    center: 'French Revolution',
    branches: [
      { label: 'Causes',     labelColor: 'text-emerald-200', items: ['Financial crisis', 'Social inequality', 'Enlightenment ideas'] },
      { label: 'Key Events', labelColor: 'text-teal-200',    items: ['Bastille stormed', 'Reign of Terror', 'Napoleon rises'] },
      { label: 'Impact',     labelColor: 'text-green-200',   items: ['End of monarchy', 'Modern democracy', 'Spread to Europe'] },
      { label: 'Key People', labelColor: 'text-cyan-200',    items: ['Louis XVI', 'Robespierre', 'Napoleon'] },
    ],
  },
];

// ── Card views ────────────────────────────────────────────────────────────────

function CoverCardView() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 py-10 gap-5">
      <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
        <BookOpen className="h-8 w-8" />
      </div>
      <div>
        <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-2">{SUBJECT}</p>
        <h2 className="text-2xl font-bold leading-snug">{CHAPTER_NAME}</h2>
      </div>
      <p className="text-blue-100/80 text-sm max-w-xs">
        AI-generated visual summary · Swipe through concepts, timeline, and exam facts
      </p>
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {[{ v: '3', l: 'Concepts' }, { v: '5', l: 'Key Dates' }, { v: '5', l: 'Must Know' }].map(s => (
          <div key={s.l} className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{s.v}</p>
            <p className="text-xs text-blue-200">{s.l}</p>
          </div>
        ))}
      </div>
      <p className="text-white/40 text-xs animate-pulse">Tap → or press arrow keys to begin</p>
    </div>
  );
}

function ConceptCardView({ card }: { card: ConceptCard }) {
  return (
    <div className="flex flex-col h-full text-white px-6 py-7 gap-4">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{card.emoji}</span>
        <div>
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Key Concept</p>
          <h2 className="text-xl font-bold leading-tight">{card.title}</h2>
        </div>
      </div>
      <div className="bg-white/10 rounded-2xl p-4 flex-1">
        <p className="text-white/90 text-sm leading-relaxed">{card.definition}</p>
      </div>
      <div className="bg-white/20 rounded-2xl p-4">
        <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">💡 Think of it this way</p>
        <p className="text-white text-sm leading-relaxed">{card.example}</p>
      </div>
    </div>
  );
}

function TimelineCardView({ card }: { card: TimelineCard }) {
  return (
    <div className="flex flex-col h-full text-white px-6 py-7">
      <div className="flex items-center gap-2 mb-5">
        <Clock className="h-5 w-5 text-white/60" />
        <h2 className="text-xl font-bold">Key Events Timeline</h2>
      </div>
      <div className="flex-1">
        {card.events.map((e, i) => (
          <div key={e.year} className="flex gap-3">
            <div className="flex flex-col items-center w-14 shrink-0">
              <span className="text-xs font-bold bg-white/20 rounded-lg px-2 py-1 text-center">{e.year}</span>
              {i < card.events.length - 1 && (
                <div className="w-0.5 flex-1 bg-white/20 my-1.5" style={{ minHeight: 12 }} />
              )}
            </div>
            <div className="pb-3 pt-0.5 flex-1">
              <p className="text-sm text-white/90 leading-snug">{e.event}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RememberCardView({ card }: { card: RememberCard }) {
  return (
    <div className="flex flex-col h-full text-white px-6 py-7 gap-3">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-yellow-200 fill-yellow-200" />
        <h2 className="text-xl font-bold">Must Remember</h2>
      </div>
      <p className="text-white/70 text-xs">These facts appear most often in exams</p>
      <div className="flex-1 flex flex-col gap-2.5">
        {card.facts.map((fact, i) => (
          <div key={i} className="flex items-start gap-3 bg-white/20 rounded-xl px-4 py-3">
            <span className="text-white/60 font-bold text-sm shrink-0 mt-0.5">{i + 1}</span>
            <p className="text-sm font-medium leading-snug">{fact}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MindMapCardView({ card }: { card: MindMapCard }) {
  return (
    <div className="flex flex-col h-full text-white px-6 py-7 gap-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-white/60" />
        <h2 className="text-xl font-bold">Big Picture</h2>
      </div>
      <div className="flex justify-center">
        <div className="bg-white text-emerald-800 font-bold text-sm px-6 py-2.5 rounded-full shadow-lg">
          {card.center}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 flex-1">
        {card.branches.map(b => (
          <div key={b.label} className="bg-white/15 rounded-2xl p-3 space-y-1.5">
            <p className={`text-xs font-bold uppercase tracking-wider ${b.labelColor}`}>{b.label}</p>
            <ul className="space-y-1">
              {b.items.map(item => (
                <li key={item} className="text-xs text-white/85 flex items-start gap-1">
                  <span className="text-white/40 shrink-0">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Text-to-speech ────────────────────────────────────────────────────────────

function cardNarration(c: AnyCard): string {
  switch (c.type) {
    case 'cover':
      return `${CHAPTER_NAME}. ${SUBJECT}. This visual summary covers 3 key concepts, 5 key dates, and 5 must-remember exam facts. Let's begin.`;
    case 'concept':
      return `Key Concept: ${c.title}. ${c.definition}. Here's a way to think about it — ${c.example}`;
    case 'timeline':
      return `Key Events Timeline. ${c.events.map(e => `${e.year}: ${e.event}`).join('. ')}.`;
    case 'remember':
      return `Must Remember — these facts appear most often in exams. ${c.facts.map((f, i) => `${i + 1}. ${f}`).join('. ')}.`;
    case 'mindmap':
      return `Big Picture: ${c.center}. ${c.branches.map(b => `${b.label}: ${b.items.join(', ')}`).join('. ')}.`;
  }
}

function speak(text: string, rate = 0.92) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

function stopSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function renderCard(c: AnyCard) {
  switch (c.type) {
    case 'cover':    return <CoverCardView />;
    case 'concept':  return <ConceptCardView card={c} />;
    case 'timeline': return <TimelineCardView card={c} />;
    case 'remember': return <RememberCardView card={c} />;
    case 'mindmap':  return <MindMapCardView card={c} />;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InfographicSamplePage() {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const audioOnRef = useRef(audioOn);
  audioOnRef.current = audioOn;

  const card = CARDS[current];

  const next = useCallback(() => setCurrent(c => Math.min(c + 1, CARDS.length - 1)), []);
  const prev = useCallback(() => setCurrent(c => Math.max(c - 1, 0)), []);

  // Auto-narrate when card changes (if audio is on)
  useEffect(() => {
    if (audioOnRef.current) speak(cardNarration(CARDS[current]));
  }, [current]);

  // Stop speech on unmount
  useEffect(() => () => stopSpeech(), []);

  // Auto-play — wait for narration to finish before advancing
  useEffect(() => {
    if (!playing) return;
    if (current >= CARDS.length - 1) { setPlaying(false); return; }
    const delay = audioOn ? 7000 : 5000; // give narration time to finish
    const id = setTimeout(() => setCurrent(c => c + 1), delay);
    return () => clearTimeout(id);
  }, [playing, current, audioOn]);

  // Keyboard nav
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  function toggleAudio() {
    const next = !audioOn;
    setAudioOn(next);
    if (next) {
      speak(cardNarration(card));
    } else {
      stopSpeech();
    }
  }

  const progress = Math.round(((current + 1) / CARDS.length) * 100);

  return (
    <div className="max-w-lg mx-auto space-y-4">

      {/* Header */}
      <div>
        <Link href="/chapters" className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> Back to Chapters
        </Link>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              <Sparkles className="h-3 w-3" /> Preview Feature
            </span>
            <h1 className="text-lg font-bold text-gray-900">Visual Summary</h1>
          </div>
          <button
            onClick={toggleAudio}
            title={audioOn ? 'Turn off narration' : 'Turn on narration'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              audioOn
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {audioOn
              ? <><Volume2 className="h-3.5 w-3.5" /> Audio On</>
              : <><VolumeX className="h-3.5 w-3.5" /> Audio Off</>}
          </button>
        </div>
        <p className="text-gray-500 text-sm">{CHAPTER_NAME} · {SUBJECT}</p>
      </div>

      {/* Card */}
      <div
        className={`bg-gradient-to-br ${card.bg} rounded-3xl shadow-xl overflow-hidden relative`}
        style={{ minHeight: 430 }}
      >
        <div style={{ minHeight: 430 }} className="flex flex-col">
          {renderCard(card)}
        </div>
        <div className="absolute top-4 right-4 bg-black/25 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium">
          {current + 1} / {CARDS.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Navigation row */}
      <div className="flex items-center gap-3">
        <button
          onClick={prev}
          disabled={current === 0}
          className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>

        {/* Dot indicators */}
        <div className="flex gap-1.5 flex-1 justify-center flex-wrap">
          {CARDS.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); setPlaying(false); }}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-6 h-2 bg-blue-600' : 'w-2 h-2 bg-gray-200 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          disabled={current === CARDS.length - 1}
          className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
        >
          <ArrowRight className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Auto-play button */}
      <button
        onClick={() => setPlaying(p => !p)}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
          playing
            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
        }`}
      >
        {playing
          ? <><Pause className="h-4 w-4" /> Pause Auto-Play</>
          : <><Play className="h-4 w-4" /> Auto-Play · 5 sec per card</>}
      </button>

      <p className="text-center text-xs text-gray-400">
        ← → arrow keys to navigate · Space to play/pause
      </p>
    </div>
  );
}
