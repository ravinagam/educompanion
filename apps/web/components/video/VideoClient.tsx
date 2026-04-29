'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
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
const BULLET_INTERVAL_S = 4;
// Seconds to linger after last bullet before auto-advancing
const SLIDE_TAIL_S = 5;

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

// ── Slide Player ──────────────────────────────────────────────────────────────

function SlidePlayer({ sections, isHindi }: { sections: VideoSection[]; isHindi: boolean }) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  // Driven by speech: bullet i appears right before it is spoken
  const [visibleBullets, setVisibleBullets] = useState(0);
  // Wall-clock progress bar (cosmetic only — does not control advance)
  const [progElapsed, setProgElapsed] = useState(0);
  const [sectionImages, setSectionImages] = useState<Record<string, string[]>>({});

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voiceEnabledRef = useRef(true);
  const playingRef = useRef(false);
  // Incremented on every new narration start; callbacks check their captured id
  const narrationIdRef = useRef(0);
  const nextBulletIdxRef = useRef(0);
  const progTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Holds the current HTMLAudioElement when using Hindi TTS
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  // Track whether Sarvam TTS is actually working (confirmed on first successful audio)
  const [hindiTtsActive, setHindiTtsActive] = useState(false);

  useEffect(() => {
    console.log('[VideoPlayer] isHindi:', isHindi);
  }, [isHindi]);

  const section = sections[slideIdx];
  const estDuration = slideDuration(section);
  const progress = Math.min((progElapsed / estDuration) * 100, 100);
  const slideImgs = sectionImages[section.id] ?? [];
  const hasTwoImages = slideImgs.length >= 2;

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

  // ── Preload Wikipedia images
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

  // Build utterance with current voice/rate settings
  const makeUtt = useCallback((text: string) => {
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.92; utt.pitch = 1.0;
    if (selectedVoiceRef.current) utt.voice = selectedVoiceRef.current;
    return utt;
  }, []);

  // Fetch Hindi audio from Sarvam TTS and play it; falls back to Web Speech on any failure
  const speakHindi = useCallback(async (text: string, onEnd: () => void, myId: number) => {
    // Fallback: use browser Web Speech API (English voice) when Sarvam is unavailable
    const fallback = (reason: string) => {
      console.warn('[TTS] Sarvam fallback →', reason);
      if (narrationIdRef.current !== myId) return;
      if (!synthRef.current) { onEnd(); return; }
      const utt = makeUtt(toSpeechText(text));
      utt.onend = () => { if (narrationIdRef.current === myId) onEnd(); };
      utt.onerror = () => { if (narrationIdRef.current === myId) onEnd(); };
      synthRef.current.speak(utt);
    };

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: 'hi-IN' }),
      });
      if (narrationIdRef.current !== myId) return;
      if (!res.ok) {
        const err = await res.text().catch(() => res.status.toString());
        fallback(`HTTP ${res.status}: ${err}`);
        return;
      }

      const data = await res.json() as { audio?: string; error?: string };
      if (narrationIdRef.current !== myId) return;
      if (!data.audio) { fallback(`no audio in response: ${JSON.stringify(data)}`); return; }

      const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
      currentAudioRef.current = audio;
      audio.onended = () => { if (narrationIdRef.current === myId) onEnd(); };
      audio.onerror = (e) => {
        console.error('[TTS] Audio playback error', e);
        if (narrationIdRef.current === myId) fallback('audio playback error');
      };
      setHindiTtsActive(true);
      console.log('[TTS] Playing Sarvam audio, length:', data.audio.length);
      await audio.play();
    } catch (e) {
      fallback(`exception: ${e}`);
    }
  }, [makeUtt]);

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
      setVisibleBullets(idx + 1); // reveal bullet before speaking it

      if (!voiceEnabledRef.current) {
        // Voice off: just reveal at fixed interval
        setTimeout(speakBullet, BULLET_INTERVAL_S * 1000);
        return;
      }

      if (isHindi) {
        speakHindi(sec.bullets[idx], speakBullet, myId);
        return;
      }

      if (!synthRef.current) {
        setTimeout(speakBullet, BULLET_INTERVAL_S * 1000);
        return;
      }
      const utt = makeUtt(toSpeechText(sec.bullets[idx]));
      utt.onend = () => { if (narrationIdRef.current === myId) speakBullet(); };
      utt.onerror = () => { if (narrationIdRef.current === myId) setTimeout(speakBullet, 400); };
      synthRef.current!.speak(utt);
    }

    // Speak slide title first, then begin bullet chain
    if (voiceEnabledRef.current) {
      if (isHindi) {
        speakHindi(sec.title, speakBullet, myId);
      } else if (synthRef.current) {
        const titleUtt = makeUtt(toSpeechText(sec.title));
        titleUtt.onend = () => { if (narrationIdRef.current === myId) speakBullet(); };
        titleUtt.onerror = speakBullet;
        synthRef.current.speak(titleUtt);
      } else {
        speakBullet();
      }
    } else {
      speakBullet();
    }
  }, [sections.length, makeUtt, isHindi, speakHindi]);

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
      <div className={`relative bg-gradient-to-br ${slideBg(section.type)} aspect-video flex flex-col px-7 py-4 transition-all duration-500`}>

        {/* Top bar */}
        <div className="flex items-center justify-between mb-2 shrink-0">
          <Badge variant="outline" className={`text-xs capitalize border ${slideAccent(section.type)}`}>
            {section.type}
          </Badge>
          <span className="text-white/50 text-xs font-mono">{slideIdx + 1} / {sections.length}</span>
        </div>

        {hasTwoImages ? (
          /* ── Two-image before-after (Grade Booster style) ── */
          <>
            <p className="text-white/70 text-xs sm:text-sm font-semibold text-center mb-2 shrink-0 tracking-wide uppercase drop-shadow">
              {section.title}
            </p>

            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-3 shrink-0">
              <div className="w-[27%] aspect-square rounded-full overflow-hidden border-[3px] border-white/20 shadow-2xl bg-black/40 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slideImgs[0]} alt="" className="w-full h-full object-cover"
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

              <div className="w-[27%] aspect-square rounded-full overflow-hidden border-[3px] border-white/20 shadow-2xl bg-black/40 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slideImgs[1]} alt="" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            </div>

            <ul className="flex-1 space-y-1.5 overflow-hidden min-h-0">
              {section.bullets.map((bullet, i) => (
                <li key={i} className={`flex items-start gap-2 transition-all duration-500 ${
                  i < visibleBullets ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                }`}>
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-yellow-400/80 shrink-0" />
                  <span className="text-white/90 text-sm sm:text-base leading-snug">{bullet}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          /* ── Single image or no-image layout ── */
          <>
            <h2 className="text-white text-xl sm:text-2xl font-bold mb-3 leading-tight shrink-0 drop-shadow-lg">
              {section.title}
            </h2>

            <div className="flex gap-5 flex-1 min-h-0 items-center">
              <ul className="flex-1 space-y-2.5 min-w-0">
                {section.bullets.map((bullet, i) => (
                  <li key={i} className={`flex items-start gap-3 transition-all duration-500 ${
                    i < visibleBullets ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                  }`}>
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/70 shrink-0" />
                    <span className="text-white/90 text-sm sm:text-base leading-snug">{bullet}</span>
                  </li>
                ))}
              </ul>

              {slideImgs.length === 1 && (
                <div className="shrink-0 w-[36%] max-h-full flex items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slideImgs[0]} alt={section.title}
                    className="rounded-xl object-cover w-full max-h-40 sm:max-h-48 shadow-2xl border border-white/10"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
      <div className="bg-gray-950 px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-mono w-24">
          <Clock className="h-3 w-3" />
          {formatTime(progElapsed)} / {formatTime(estDuration)}
        </div>

        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white"
            onClick={prev} disabled={slideIdx === 0}>
            <SkipBack className="h-4 w-4" />
          </Button>

          {ended ? (
            <Button size="sm" className="h-8 px-4 bg-white text-gray-900 hover:bg-gray-100" onClick={restart}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restart
            </Button>
          ) : (
            <Button size="icon" className="h-9 w-9 rounded-full bg-white text-gray-900 hover:bg-gray-100"
              onClick={() => { const p = !playing; setPlaying(p); playingRef.current = p; }}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>
          )}

          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white"
            onClick={next} disabled={ended}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 w-24 justify-end">
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
            {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </Button>
          <div className="flex items-center gap-1">
            {sections.map((_, i) => (
              <button key={i} onClick={() => goToSlide(i)}
                className={`rounded-full transition-all ${
                  i === slideIdx ? 'w-4 h-2 bg-white' : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                }`} />
            ))}
          </div>
        </div>
      </div>
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
                <CardTitle className="text-base flex items-center gap-2">
                  <Play className="h-4 w-4 text-blue-500" />
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

          <SlidePlayer sections={sections} isHindi={subjectName.toLowerCase().includes('hindi')} />

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
