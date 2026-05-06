import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logCostDirect, SARVAM_COST_PER_CHAR } from '@/lib/ai/usage';

const SARVAM_API_KEY = process.env.SARVAM_API_KEY ?? '';
const TTS_BUCKET = 'tts-cache';

// Female-first speaker priority for English — tried in order until one succeeds
const ENGLISH_SPEAKERS = ['anushka', 'meera', 'pavithra', 'maitreyi', 'vidya', 'arya', 'amol'];

function cacheKey(text: string, lang: string): string {
  return createHash('sha256').update(text.slice(0, 500) + lang).digest('hex') + '.wav';
}

async function getCached(key: string): Promise<string | null> {
  try {
    const { data, error } = await createAdminClient().storage.from(TTS_BUCKET).download(key);
    if (error || !data) return null;
    const buf = await data.arrayBuffer();
    return Buffer.from(buf).toString('base64');
  } catch {
    return null;
  }
}

async function setCache(key: string, base64: string): Promise<void> {
  try {
    const bytes = Buffer.from(base64, 'base64');
    await createAdminClient().storage.from(TTS_BUCKET).upload(key, bytes, {
      contentType: 'audio/wav',
      upsert: false,
    });
  } catch {
    // Cache write failure is non-fatal
  }
}

async function sarvamTTS(text: string, language: string, speaker: string): Promise<Response> {
  return fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-Subscription-Key': SARVAM_API_KEY,
    },
    body: JSON.stringify({
      inputs: [text.slice(0, 500)],
      target_language_code: language,
      speaker,
      model: 'bulbul:v2',
      pitch: 0,
      pace: language.startsWith('en') ? 0.85 : 0.8,
      loudness: 1.5,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      eng_interpolation_wt: 128,
    }),
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text, language } = await request.json() as { text: string; language?: string };
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  if (!SARVAM_API_KEY) {
    return NextResponse.json({ error: 'use browser TTS' }, { status: 503 });
  }

  const isEnglish = !language || language.startsWith('en');
  const lang = isEnglish ? 'en-IN' : (language ?? 'hi-IN');
  const key = cacheKey(text, lang);

  // Cache hit — return immediately, no Sarvam call, no cost
  const cached = await getCached(key);
  if (cached) return NextResponse.json({ audio: cached, format: 'wav' });

  // ── English: try each speaker until one works ──────────────────────────────
  if (isEnglish) {
    for (const speaker of ENGLISH_SPEAKERS) {
      let res: Response;
      try {
        res = await sarvamTTS(text, lang, speaker);
      } catch {
        continue;
      }
      if (!res.ok) {
        console.warn(`[TTS] speaker "${speaker}" unavailable (${res.status})`);
        continue;
      }
      const data = await res.json() as { audios?: string[] };
      const audio = data.audios?.[0] ?? null;
      if (!audio) continue;
      const charCount = text.slice(0, 500).length;
      logCostDirect(user.id, 'tts', `bulbul:v2-${speaker}`, charCount, charCount * SARVAM_COST_PER_CHAR).catch(console.error);
      setCache(key, audio).catch(console.error); // fire-and-forget
      return NextResponse.json({ audio, format: 'wav' });
    }
    console.error('[TTS] All Sarvam English speakers failed');
    return NextResponse.json({ error: 'use browser TTS' }, { status: 503 });
  }

  // ── Hindi / other: Sarvam anushka ─────────────────────────────────────────
  const res = await sarvamTTS(text, lang, 'anushka');
  if (!res.ok) {
    const err = await res.text();
    console.error('[TTS] Sarvam Hindi error', res.status, err);
    return NextResponse.json({ error: 'use browser TTS' }, { status: 503 });
  }
  const data = await res.json() as { audios?: string[] };
  const audio = data.audios?.[0] ?? null;
  if (!audio) return NextResponse.json({ error: 'use browser TTS' }, { status: 503 });

  const charCount = text.slice(0, 500).length;
  logCostDirect(user.id, 'tts', 'bulbul:v2-anushka', charCount, charCount * SARVAM_COST_PER_CHAR).catch(console.error);
  setCache(key, audio).catch(console.error); // fire-and-forget
  return NextResponse.json({ audio, format: 'wav' });
}
