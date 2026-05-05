'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { XpToast } from '@/components/gamification/XpToast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Play, Pause, SkipBack, SkipForward, Loader2,
  ArrowLeft, Clock, BookOpen, Zap, RefreshCw, RotateCcw,
  Volume2, VolumeX,
} from 'lucide-react';

// Animated waveform shown in place of the volume icon while narrating
function WaveformBars() {
  return (
    <div className="flex items-end gap-px h-3.5 w-5">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="wave-bar w-1 h-full rounded-full bg-white/80" />
      ))}
    </div>
  );
}

interface VideoSection {
  id: string;
  type: 'intro' | 'topic' | 'summary';
  title: string;
  bullets: string[];
  duration_seconds: number;
  timestamp_seconds: number;
  image_queries?: string[];
  image_label?: string | null;
  image_query?: string;
  bullet_queries?: string[];
}

interface VideoScriptContent {
  title: string;
  sections: VideoSection[];
}

interface VideoScript {
  id: string;
  chapter_id: string;
  script_json: VideoScriptContent;
  video_url: string | null;
  render_status: string;
}

interface Props {
  chapter: { id: string; name: string; upload_status: string };
  subjectName: string;
  videoScript: VideoScript | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function slideBg(type: string) {
  if (type === 'intro') return 'from-indigo-950 via-blue-900 to-blue-800';
  if (type === 'summary') return 'from-purple-950 via-purple-900 to-fuchsia-900';
  return 'from-slate-950 via-slate-900 to-slate-800';
}

function slideAccent(type: string) {
  if (type === 'intro') return 'bg-blue-400/20 text-blue-200 border-blue-400/30';
  if (type === 'summary') return 'bg-purple-400/20 text-purple-200 border-purple-400/30';
  return 'bg-white/10 text-gray-300 border-white/20';
}

// Fallback interval (seconds) when voice is off
const BULLET_INTERVAL_S = 3;
// Seconds to linger after last bullet before auto-advancing
const SLIDE_TAIL_S = 2;

function slideDuration(sec: VideoSection) {
  return sec.bullets.length * BULLET_INTERVAL_S + SLIDE_TAIL_S;
}

function getSectionImageQueries(sec: VideoSection): string[] {
  if (sec.image_queries?.length) return sec.image_queries;
  if (sec.image_query) return [sec.image_query];
  return [];
}

// Pre-process text to natural teacher speech — chemical formulas, symbols, abbreviations
function toSpeechText(text: string): string {
  return text
    // Chemical reaction arrows
    .replace(/\s*→\s*/g, ' gives ')
    .replace(/\s*->\s*/g, ' gives ')
    .replace(/\s*⟶\s*/g, ' gives ')
    // Math relations
    .replace(/\s*≠\s*/g, ' is not equal to ')
    .replace(/\s*≈\s*/g, ' is approximately ')
    .replace(/\s*≤\s*/g, ' is less than or equal to ')
    .replace(/\s*≥\s*/g, ' is greater than or equal to ')
    // Unicode subscripts: H₂O → H2O (before formula spelling so digits are ASCII)
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, d => '0123456789'['₀₁₂₃₄₅₆₇₈₉'.indexOf(d)])
    // Unicode superscripts
    .replace(/²/g, ' squared').replace(/³/g, ' cubed')
    // ── Chemical formula pronunciation ─────────────────────────────────────
    // Step 1: spell element-symbol + subscript digit: Fe2→F e 2, O3→O 3, H2→H 2
    .replace(/([A-Z][a-z]?)(\d+)/g, (_, sym, num) => sym.split('').join(' ') + ' ' + num)
    // Step 2: split consecutive element symbols: CO→C O, NaCl→Na Cl, CaO→Ca O
    .replace(/([A-Z][a-z]?)([A-Z])/g, '$1 $2')
    // Step 3: split digit from following uppercase: 2O→2 O
    .replace(/(\d)([A-Z])/g, '$1 $2')
    // ───────────────────────────────────────────────────────────────────────
    // Math equals in formulas (after formula expansion to avoid affecting >=, etc.)
    .replace(/\s*=\s*/g, ' equals ')
    // Units
    .replace(/°C/g, ' degrees Celsius').replace(/°F/g, ' degrees Fahrenheit')
    .replace(/\bkm\/h\b/g, 'kilometres per hour').replace(/\bm\/s\b/g, 'metres per second')
    .replace(/\b(\d+)\s*%/g, '$1 percent')
    // Abbreviations
    .replace(/\bLHS\b/g, 'left-hand side').replace(/\bRHS\b/g, 'right-hand side')
    .replace(/\beg\b\.?/gi, 'for example').replace(/\bi\.e\.\b/gi, 'that is')
    .replace(/\betc\.\b/gi, 'and so on').replace(/\bviz\.\b/gi, 'namely')
    // + between terms → "plus"
    .replace(/(?<=\S)\s*\+\s*(?=\S)/g, ' plus ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Try Wikipedia summary API (exact title), fall back to search
async function fetchWikiImage(query: string): Promise<string | null> {
  try {
    const slug = encodeURIComponent(query.replace(/ /g, '_'));
    const sRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`);
    if (sRes.ok) {
      const d = await sRes.json();
      if (d.thumbnail?.source) return d.thumbnail.source as string;
    }
    const qRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5&prop=pageimages&pithumbsize=600&format=json&origin=*`
    );
    if (!qRes.ok) return null;
    const qd = await qRes.json();
    const pages = qd.query?.pages as Record<string, { thumbnail?: { source: string } }> | undefined;
    if (!pages) return null;
    const hit = Object.values(pages).find(p => p.thumbnail?.source);
    return hit?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

// TTS fetch cache — keyed by "lang::text". Promises are shared so concurrent
// calls for the same text never fire duplicate requests (prefetch + play).
function fetchTTSCached(
  cache: Map<string, Promise<{ audio: string; format: string } | null>>,
  text: string,
  language: string,
): Promise<{ audio: string; format: string } | null> {
  const key = `${language}::${text.slice(0, 200)}`;
  if (!cache.has(key)) {
    cache.set(key, fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    }).then(async r => {
      if (!r.ok) return null;
      const d = await r.json() as { audio?: string; format?: string };
      return d.audio ? { audio: d.audio, format: d.format ?? 'wav' } : null;
    }).catch(() => null));
  }
  return cache.get(key)!;
}

// ── Slide Player ──────────────────────────────────────────────────────────────

function SlidePlayer({ sections, isHindi }: { sections: VideoSection[]; isHindi: boolean }) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [xpToast, setXpToast] = useState<number | null>(null);

  useEffect(() => {
    if (!ended) return;
    fetch('/api/gamification/xp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'video_watched' }) })
      .then(r => r.json())
      .then(d => { if (d.xp_awarded) setXpToast(d.xp_awarded); })
      .catch(() => {});
  }, [ended]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  // Driven by speech: bullet i appears right before it is spoken
  const [visibleBullets, setVisibleBullets] = useState(0);
  // Wall-clock progress bar (cosmetic only — does not control advance)
  const [progElapsed, setProgElapsed] = useState(0);
  const [sectionImages, setSectionImages] = useState<Record<string, string[]>>({});
  // Per-section bullet-level images: sectionId → array of urls (null = not found)
  const [bulletImagesMap, setBulletImagesMap] = useState<Record<string, (string | null)[]>>({});
  // A/B image crossfade slots
  const [imgA, setImgA] = useState<string | null>(null);
  const [imgB, setImgB] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<'a' | 'b'>('a');
  const [dirA, setDirA] = useState<'l' | 'r'>('l');
  const [dirB, setDirB] = useState<'l' | 'r'>('r');
  const activeSlotRef = useRef<'a' | 'b'>('a');

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voiceEnabledRef = useRef(true);
  const playingRef = useRef(false);
  // Incremented on every new narration start; callbacks check their captured id
  const narrationIdRef = useRef(0);
  const nextBulletIdxRef = useRef(0);
  const progTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Single persistent audio element — reusing the same element keeps the iOS
  // audio session alive across slide transitions (new elements get blocked after ~2s silence)
  const persistentAudioRef = useRef<HTMLAudioElement | null>(null);
  // Holds the current HTMLAudioElement (always = persistentAudioRef.current)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  // iOS Safari requires a user-gesture-triggered AudioContext before async audio.play() works
  const audioUnlockedRef = useRef(false);
  // TTS prefetch cache shared across all speakViaApi calls in this player instance
  const ttsCacheRef = useRef<Map<string, Promise<{ audio: string; format: string } | null>>>(new Map());
  // Track whether Sarvam TTS is actually working (confirmed on first successful audio)
  const [hindiTtsActive, setHindiTtsActive] = useState(false);

  useEffect(() => {
    console.log('[VideoPlayer] isHindi:', isHindi);
  }, [isHindi]);

  // ── Persistent audio element (created once, reused forever) ──────────────
  useEffect(() => {
    const audio = new Audio();
    (audio as HTMLAudioElement & { playsInline: boolean }).playsInline = true;
    persistentAudioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  // ── iOS Safari audio unlock ───────────────────────────────────────────────
  // Must be called synchronously inside a user-gesture handler.
  // Playing a silent AudioContext buffer unlocks subsequent audio.play() calls
  // even after async fetch() operations (which break out of the gesture context).
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    audioUnlockedRef.current = true;
    // Play a silent clip on the SAME persistent element so iOS links the
    // user gesture to this element — all future .play() calls on it are allowed.
    try {
      const audio = persistentAudioRef.current;
      if (!audio) return;
      audio.volume = 0;
      audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      audio.play().catch(() => {});
    } catch { /* no-op */ }
  }, []);

  // ── A/B crossfade: transition to a new image url ──────────────────────────
  const transitionTo = useCallback((url: string) => {
    if (activeSlotRef.current === 'a') {
      setDirB(d => d === 'l' ? 'r' : 'l');
      setImgB(url);
      setActiveSlot('b');
      activeSlotRef.current = 'b';
    } else {
      setDirA(d => d === 'l' ? 'r' : 'l');
      setImgA(url);
      setActiveSlot('a');
      activeSlotRef.current = 'a';
    }
  }, []);

  const section = sections[slideIdx];
  const estDuration = slideDuration(section);
  // Drive progress from narration state: moves exactly when each bullet is spoken
  const progress = section.bullets.length === 0
    ? 100
    : Math.min((visibleBullets / section.bullets.length) * 100, 100);
  const slideImgs = sectionImages[section.id] ?? [];
  const hasTwoImages = slideImgs.length >= 2;
  // Show A/B panel when at least one slot has an image (and it's not a before/after slide)
  const hasAnyImage = !hasTwoImages && (imgA !== null || imgB !== null);

  // ── Speech synthesis init + female voice selection
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    synthRef.current = window.speechSynthesis;
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      // Tier-1: high-quality neural/online female voices (Edge, Chrome)
      const NEURAL = ['aria online', 'jenny online', 'sara online', 'emma online',
                      'ana online', 'natasha online', 'leah online'];
      // Tier-2: any known female name (cross-platform)
      const FEMALE = ['aria', 'jenny', 'sara', 'emma', 'samantha', 'karen',
                      'victoria', 'hazel', 'susan', 'sonia', 'libby', 'mia',
                      'ava', 'allison', 'zira', 'tessa', 'moira', 'fiona',
                      'female', 'woman'];
      const enVoices = voices.filter(v => v.lang.startsWith('en'));
      selectedVoiceRef.current =
        enVoices.find(v => NEURAL.some(h => v.name.toLowerCase().includes(h))) ??
        enVoices.find(v => FEMALE.some(h => v.name.toLowerCase().includes(h))) ??
        enVoices.find(v => v.lang === 'en-US') ??
        enVoices[0] ??
        voices[0] ?? null;
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
    return () => { synthRef.current?.cancel(); };
  }, []);

  // ── Preload section-level Wikipedia images (image_queries)
  useEffect(() => {
    sections.forEach(sec => {
      const queries = getSectionImageQueries(sec);
      if (!queries.length) return;
      Promise.all(queries.map(fetchWikiImage)).then(results => {
        const urls = results.filter(Boolean) as string[];
        if (urls.length) setSectionImages(prev => ({ ...prev, [sec.id]: urls }));
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Preload bullet-level Wikipedia images (bullet_queries)
  useEffect(() => {
    sections.forEach(sec => {
      if (!sec.bullet_queries?.length) return;
      Promise.all(
        sec.bullet_queries.map(q => (q ? fetchWikiImage(q) : Promise.resolve(null)))
      ).then(results => {
        setBulletImagesMap(prev => ({ ...prev, [sec.id]: results }));
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reset image slots on slide change
  useEffect(() => {
    setImgA(null);
    setImgB(null);
    setDirA('l');
    setDirB('r');
    setActiveSlot('a');
    activeSlotRef.current = 'a';
  }, [slideIdx]);

  // ── Show first available image once slots are empty and images load
  useEffect(() => {
    if (imgA !== null || imgB !== null) return;
    const firstBullet = bulletImagesMap[section.id]?.[0] ?? null;
    const firstSection = sectionImages[section.id]?.[0] ?? null;
    const init = firstBullet ?? firstSection;
    if (init) { setImgA(init); setDirA('l'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionImages, bulletImagesMap, section.id]);

  // ── Sync image to the bullet currently being spoken
  useEffect(() => {
    if (visibleBullets === 0) return;
    const idx = visibleBullets - 1;
    const bulletImg = bulletImagesMap[section.id]?.[idx] ?? null;
    const fallback  = sectionImages[section.id]?.[0] ?? null;
    const target = bulletImg ?? fallback;
    if (target) transitionTo(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleBullets]);

  // Build utterance with current voice/rate settings
  const makeUtt = useCallback((text: string) => {
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.9; utt.pitch = 1.08;
    if (selectedVoiceRef.current) utt.voice = selectedVoiceRef.current;
    return utt;
  }, []);

  // Generic API-backed TTS: calls /api/tts, plays returned base64 audio.
  // Falls back to Web Speech on any failure.
  const speakViaApi = useCallback(async (
    text: string,
    language: string,
    onStart: () => void,
    onEnd: () => void,
    myId: number,
  ) => {
    const fallback = (reason: string) => {
      console.warn('[TTS] API fallback →', reason);
      if (narrationIdRef.current !== myId) return;
      onStart();
      if (!synthRef.current) { onEnd(); return; }
      const utt = makeUtt(toSpeechText(text));
      let settled = false;
      const advance = () => {
        if (settled || narrationIdRef.current !== myId) return;
        settled = true;
        onEnd();
      };
      // Timeout guard — iOS Safari sometimes never fires onend/onerror
      const guard = setTimeout(advance, 9000);
      utt.onend  = () => { clearTimeout(guard); advance(); };
      utt.onerror = () => { clearTimeout(guard); advance(); };
      synthRef.current.speak(utt);
    };

    try {
      const data = await fetchTTSCached(ttsCacheRef.current, text, language);
      if (narrationIdRef.current !== myId) return;
      if (!data) { fallback('TTS API failed'); return; }

      const mime = data.format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
      // Reuse the persistent element — iOS keeps the audio session alive on a
      // single element across slide transitions (new elements get blocked)
      const audio = persistentAudioRef.current ?? new Audio();
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      audio.volume = 1;
      audio.src = `data:${mime};base64,${data.audio}`;
      currentAudioRef.current = audio;
      audio.onended = () => { if (narrationIdRef.current === myId) onEnd(); };
      audio.onerror = () => { if (narrationIdRef.current === myId) fallback('playback error'); };
      if (language === 'hi-IN') setHindiTtsActive(true);
      onStart(); // reveal bullet exactly when audio is about to play
      await audio.play();
    } catch (e) {
      fallback(`exception: ${e}`);
    }
  }, [makeUtt]);

  // Convenience wrappers kept for call-site clarity
  const speakHindi = useCallback((text: string, onStart: () => void, onEnd: () => void, myId: number) =>
    speakViaApi(text, 'hi-IN', onStart, onEnd, myId), [speakViaApi]);

  const speakEnglish = useCallback((text: string, onStart: () => void, onEnd: () => void, myId: number) =>
    speakViaApi(toSpeechText(text), 'en-US', onStart, onEnd, myId), [speakViaApi]);

  // Stop all narration — invalidate running callbacks by bumping the narration id
  const stopNarration = useCallback(() => {
    narrationIdRef.current++;
    synthRef.current?.cancel();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }, []);

  // Speech-driven narration: title → bullet[0] → bullet[1] → ... → advance
  // Each bullet appears ON SCREEN right before it is spoken, keeping display in sync.
  const startNarration = useCallback((sec: VideoSection) => {
    narrationIdRef.current++;
    const myId = narrationIdRef.current;

    function speakBullet() {
      if (narrationIdRef.current !== myId) return; // this narration was superseded
      const idx = nextBulletIdxRef.current;

      if (idx >= sec.bullets.length) {
        // All bullets spoken — wait tail, then advance
        setTimeout(() => {
          if (narrationIdRef.current !== myId || !playingRef.current) return;
          setSlideIdx(prev => {
            const next = prev + 1;
            if (next < sections.length) return next;
            setPlaying(false); playingRef.current = false; setEnded(true);
            return prev;
          });
        }, SLIDE_TAIL_S * 1000);
        return;
      }

      nextBulletIdxRef.current = idx + 1;

      if (!voiceEnabledRef.current) {
        // Voice off: reveal immediately then wait the fixed interval
        setVisibleBullets(idx + 1);
        setTimeout(speakBullet, BULLET_INTERVAL_S * 1000);
        return;
      }

      // Voice on: reveal bullet via onStart, fired right as audio begins playing
      // Add a short pause after each bullet before starting the next
      const reveal = () => setVisibleBullets(idx + 1);
      const speakBulletAfterPause = () => setTimeout(speakBullet, 600);
      if (isHindi) {
        speakHindi(sec.bullets[idx], reveal, speakBulletAfterPause, myId);
      } else {
        speakEnglish(sec.bullets[idx], reveal, speakBulletAfterPause, myId);
      }
      // Prefetch next bullet immediately so it's ready when this one ends
      const nextIdx = idx + 1;
      if (nextIdx < sec.bullets.length) {
        const nextText = isHindi ? sec.bullets[nextIdx] : toSpeechText(sec.bullets[nextIdx]);
        fetchTTSCached(ttsCacheRef.current, nextText, isHindi ? 'hi-IN' : 'en-US');
      }
    }

    // Speak slide title first, then begin bullet chain
    if (voiceEnabledRef.current) {
      // Prefetch bullet[0] while the title is being fetched/played
      if (sec.bullets.length > 0) {
        const firstText = isHindi ? sec.bullets[0] : toSpeechText(sec.bullets[0]);
        fetchTTSCached(ttsCacheRef.current, firstText, isHindi ? 'hi-IN' : 'en-US');
      }
      const noop = () => {};
      if (isHindi) {
        speakHindi(sec.title, noop, speakBullet, myId);
      } else {
        speakEnglish(sec.title, noop, speakBullet, myId);
      }
    } else {
      speakBullet();
    }
  }, [sections.length, isHindi, speakHindi, speakEnglish]);

  // Navigation helpers
  const goToSlide = useCallback((idx: number) => {
    stopNarration();
    nextBulletIdxRef.current = 0;
    setVisibleBullets(0);
    setProgElapsed(0);
    setSlideIdx(idx);
    setEnded(false);
  }, [stopNarration]);

  const prev = useCallback(() => {
    if (slideIdx > 0) goToSlide(slideIdx - 1);
  }, [slideIdx, goToSlide]);

  const next = useCallback(() => {
    if (slideIdx < sections.length - 1) goToSlide(slideIdx + 1);
    else { stopNarration(); setPlaying(false); playingRef.current = false; setEnded(true); }
  }, [slideIdx, sections.length, goToSlide, stopNarration]);

  const restart = useCallback(() => {
    goToSlide(0);
    // Small delay lets state settle before starting playback
    setTimeout(() => { setPlaying(true); playingRef.current = true; }, 50);
  }, [goToSlide]);

  const toggleVoice = useCallback(() => {
    const v = !voiceEnabledRef.current;
    voiceEnabledRef.current = v;
    setVoiceEnabled(v);
    if (!v) synthRef.current?.cancel();
  }, []);

  // ── Progress bar timer (wall clock, cosmetic)
  useEffect(() => {
    if (playing) {
      progTimerRef.current = setInterval(() => {
        setProgElapsed(e => Math.min(e + 1, estDuration));
      }, 1000);
    } else {
      if (progTimerRef.current) clearInterval(progTimerRef.current);
    }
    return () => { if (progTimerRef.current) clearInterval(progTimerRef.current); };
  }, [playing, estDuration]);

  // ── Reset per-slide state when slide changes
  useEffect(() => {
    nextBulletIdxRef.current = 0;
    setVisibleBullets(0);
    setProgElapsed(0);
  }, [slideIdx]);

  // ── Start/stop narration when playing or slideIdx changes
  useEffect(() => {
    playingRef.current = playing;
    if (playing) {
      startNarration(section);
    } else {
      stopNarration();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, slideIdx]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 select-none">
      {/* Slide */}
      <div className={`relative bg-gradient-to-br ${slideBg(section.type)} aspect-[4/3] sm:aspect-video flex flex-col px-4 pt-2 pb-5 sm:px-7 sm:py-4 overflow-hidden transition-all duration-500`}>

        {/* Ambient breathing light — position shifts per slide type */}
        <div
          className="absolute inset-0 slide-ambient"
          style={{
            background: section.type === 'intro'
              ? 'radial-gradient(ellipse at 18% 28%, rgba(99,102,241,0.35) 0%, transparent 60%)'
              : section.type === 'summary'
              ? 'radial-gradient(ellipse at 82% 22%, rgba(168,85,247,0.35) 0%, transparent 60%)'
              : 'radial-gradient(ellipse at 50% 65%, rgba(56,189,248,0.22) 0%, transparent 60%)',
          }}
        />

        {/* Top bar */}
        <div className="flex items-center justify-between mb-1 sm:mb-2 shrink-0">
          <Badge variant="outline" className={`text-xs capitalize border ${slideAccent(section.type)}`}>
            {section.type}
          </Badge>
          <span key={slideIdx} className="slide-counter text-white/50 text-xs font-mono">
            {slideIdx + 1} / {sections.length}
          </span>
        </div>

        {hasTwoImages ? (
          /* ── Two-image before-after (Grade Booster style) ── */
          <>
            <p className="text-white/70 text-[10px] sm:text-sm font-semibold text-center mb-1 sm:mb-2 shrink-0 tracking-wide uppercase drop-shadow">
              {section.title}
            </p>

            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-2 sm:mb-3 shrink-0">
              <div key={`img0-${slideIdx}`} className="img-entrance w-[22%] sm:w-[27%] aspect-square rounded-full overflow-hidden border-[3px] border-white/20 shadow-2xl bg-black/40 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slideImgs[0]} alt="" className="w-full h-full object-cover ken-burns-l"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>

              <div className="flex flex-col items-center gap-1 shrink-0 max-w-[90px]">
                <span className="text-white font-bold text-[10px] sm:text-xs text-center leading-tight drop-shadow">
                  {section.image_label ?? ''}
                </span>
                <div className="flex items-center mt-0.5">
                  <div className="w-8 sm:w-12 h-[3px] bg-yellow-400 rounded-l" />
                  <div className="w-0 h-0 border-l-[10px] border-l-yellow-400 border-y-[5px] border-y-transparent" />
                </div>
              </div>

              <div key={`img1-${slideIdx}`} className="img-entrance w-[22%] sm:w-[27%] aspect-square rounded-full overflow-hidden border-[3px] border-white/20 shadow-2xl bg-black/40 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slideImgs[1]} alt="" className="w-full h-full object-cover ken-burns-r"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            </div>

            <ul className="flex-1 space-y-0.5 sm:space-y-1.5 overflow-hidden min-h-0">
              {section.bullets.map((bullet, i) => (
                <li key={i} className={`flex items-start gap-1.5 transition-all duration-500 ${
                  i < visibleBullets ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                }`}>
                  <span className="mt-1 sm:mt-1.5 h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-yellow-400/80 shrink-0" />
                  <span className="text-white/90 text-[11px] sm:text-base leading-snug">{bullet}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          /* ── Single image or no-image layout ── */
          <>
            <h2 className="text-white text-sm sm:text-2xl font-bold mb-1 sm:mb-3 leading-snug shrink-0 drop-shadow-lg">
              {section.title}
            </h2>

            <div className="flex gap-3 sm:gap-5 flex-1 min-h-0 items-start sm:items-center overflow-hidden">
              <ul className="flex-1 space-y-0.5 sm:space-y-2.5 min-w-0 overflow-hidden">
                {section.bullets.map((bullet, i) => (
                  <li key={i} className={`flex items-start gap-1.5 sm:gap-3 transition-all duration-500 ${
                    i < visibleBullets ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                  }`}>
                    <span className="mt-1 sm:mt-2 h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-white/70 shrink-0" />
                    <span className="text-white/90 text-[11px] sm:text-base leading-snug">{bullet}</span>
                  </li>
                ))}
              </ul>

              {hasAnyImage && (
                <div className="shrink-0 w-[30%] sm:w-[36%]">
                  <div className="relative overflow-hidden rounded-xl w-full h-24 sm:h-48 shadow-2xl border border-white/10">
                    {imgA && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img key={`a-${imgA}`} src={imgA} alt=""
                          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ken-burns-${dirA} ${activeSlot === 'a' ? 'opacity-100' : 'opacity-0'}`}
                          onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
                      </>
                    )}
                    {imgB && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img key={`b-${imgB}`} src={imgB} alt=""
                          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ken-burns-${dirB} ${activeSlot === 'b' ? 'opacity-100' : 'opacity-0'}`}
                          onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div className="h-full bg-white/60 transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-950 px-2 sm:px-5 py-3 flex items-center justify-between gap-2 sm:gap-4">
        <div className="hidden sm:flex items-center gap-1.5 text-gray-400 text-xs font-mono shrink-0">
          <Clock className="h-3 w-3" />
          {formatTime(progElapsed)} / {formatTime(estDuration)}
        </div>

        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white"
            onClick={prev} disabled={slideIdx === 0}>
            <SkipBack className="h-4 w-4" />
          </Button>

          {ended ? (
            <Button size="sm" className="h-8 px-4 bg-white text-gray-900 hover:bg-gray-100"
              onClick={() => { unlockAudio(); restart(); }}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restart
            </Button>
          ) : (
            <Button size="icon" className="h-9 w-9 rounded-full bg-white text-gray-900 hover:bg-gray-100"
              onClick={() => { unlockAudio(); const p = !playing; setPlaying(p); playingRef.current = p; }}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>
          )}

          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white"
            onClick={next} disabled={ended}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 shrink-0 justify-end">
          {isHindi && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              hindiTtsActive ? 'bg-orange-500/30 text-orange-300' : 'bg-white/10 text-white/40'
            }`} title={hindiTtsActive ? 'Hindi TTS active' : 'Hindi TTS loading…'}>
              हि
            </span>
          )}
          <Button size="icon" variant="ghost"
            className={`h-7 w-7 ${voiceEnabled ? 'text-white' : 'text-gray-600'}`}
            onClick={toggleVoice}
            title={voiceEnabled ? 'Mute narration' : 'Enable narration'}>
            {voiceEnabled && playing
              ? <WaveformBars />
              : voiceEnabled
              ? <Volume2 className="h-3.5 w-3.5" />
              : <VolumeX className="h-3.5 w-3.5" />}
          </Button>
          <div className="hidden sm:flex items-center gap-1">
            {sections.map((_, i) => (
              <button key={i} onClick={() => goToSlide(i)}
                className={`rounded-full transition-all ${
                  i === slideIdx ? 'w-4 h-2 bg-white' : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                }`} />
            ))}
          </div>
        </div>
      </div>
      {xpToast !== null && (
        <XpToast xp={xpToast} onDone={() => setXpToast(null)} />
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function VideoClient({ chapter, subjectName, videoScript: initialScript }: Props) {
  const [script, setScript] = useState(initialScript);
  const [generating, setGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  async function generateScript() {
    setGenerating(true);
    const res = await fetch(`/api/generate/video-script/${chapter.id}`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? 'Generation failed'); }
    else { setScript(json.data); toast.success('Video script generated!'); }
    setGenerating(false);
  }

  const scriptContent = script?.script_json as VideoScriptContent | null;
  const sections = scriptContent?.sections ?? [];
  const totalDuration = sections.reduce((s, sec) => s + slideDuration(sec), 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Link href={`/chapters?subject=${encodeURIComponent(subjectName)}`} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> Back to Chapters
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{subjectName} - {chapter.name}</h1>
        <h2 className="text-xl font-bold text-gray-700">Video Lesson</h2>
      </div>

      {script?.render_status === 'rendering' && !generating ? (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 className="h-12 w-12 text-gray-300 mx-auto animate-spin" />
            <div>
              <p className="font-medium text-gray-700">Generating your video lesson…</p>
              <p className="text-sm text-gray-400 mt-1">This usually takes 15–30 seconds. Refresh to check.</p>
            </div>
          </CardContent>
        </Card>
      ) : !script || script.render_status === 'error' ? (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Zap className="h-12 w-12 text-gray-300 mx-auto" />
            <div>
              <p className="font-medium text-gray-700">
                {script?.render_status === 'error' ? 'Generation failed — try again' : 'No video lesson generated yet'}
              </p>
              <p className="text-sm text-gray-400 mt-1">Generate an interactive slide presentation from this chapter</p>
            </div>
            {chapter.upload_status !== 'ready' ? (
              <p className="text-sm text-amber-600">Chapter is still processing.</p>
            ) : (
              <Button onClick={generateScript} disabled={generating} size="lg">
                {generating
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</>
                  : <><Zap className="h-4 w-4 mr-2" />Generate Video Lesson</>}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : sections.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">Script data is empty. Try regenerating.</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">
                  {scriptContent?.title}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(totalDuration)}
                  </div>
                  <Badge variant="outline">{sections.length} slides</Badge>
                  <Button size="sm" variant="ghost" onClick={generateScript} disabled={generating} className="h-7 text-xs gap-1">
                    {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Regenerate
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <SlidePlayer key={script?.id ?? 'player'} sections={sections} isHindi={subjectName.toLowerCase().includes('hindi')} />

          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Lesson Outline
            </h2>
            {sections.map((sec, i) => (
              <Card key={sec.id} className="cursor-pointer border transition-all"
                onClick={() => setActiveSection(activeSection === sec.id ? null : sec.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        sec.type === 'intro' ? 'bg-blue-100 text-blue-700' :
                        sec.type === 'summary' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                      }`}>{i + 1}</div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{sec.title}</p>
                        <p className="text-xs text-gray-400">{formatTime(sec.timestamp_seconds)} · {formatTime(slideDuration(sec))}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs capitalize shrink-0 ${
                      sec.type === 'intro' ? 'border-blue-300 text-blue-700' :
                      sec.type === 'summary' ? 'border-purple-300 text-purple-700' : 'border-gray-200 text-gray-600'
                    }`}>{sec.type}</Badge>
                  </div>
                  {activeSection === sec.id && (
                    <>
                      <Separator className="my-3" />
                      <ul className="space-y-1.5 ml-10">
                        {sec.bullets.map((bullet, bi) => (
                          <li key={bi} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
