import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logCostDirect, SARVAM_COST_PER_CHAR } from '@/lib/ai/usage';

const SARVAM_API_KEY = process.env.SARVAM_API_KEY ?? '';

// Female-first speaker priority for English — tried in order until one succeeds
const ENGLISH_SPEAKERS = ['anushka', 'meera', 'pavithra', 'maitreyi', 'vidya', 'arya', 'amol'];

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
      pace: language.startsWith('en') ? 1.0 : 0.9,
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
        const err = await res.text();
        console.warn(`[TTS] speaker "${speaker}" unavailable (${res.status}): ${err.slice(0, 120)}`);
        continue;
      }
      const data = await res.json() as { audios?: string[] };
      const audio = data.audios?.[0] ?? null;
      if (!audio) continue;
      const charCount = text.slice(0, 500).length;
      logCostDirect(user.id, 'tts', `bulbul:v2-${speaker}`, charCount, charCount * SARVAM_COST_PER_CHAR).catch(console.error);
      return NextResponse.json({ audio, format: 'wav' });
    }
    // All speakers exhausted — last resort: browser TTS
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
  return NextResponse.json({ audio, format: 'wav' });
}
