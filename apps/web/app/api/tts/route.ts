import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logCostDirect, SARVAM_COST_PER_CHAR } from '@/lib/ai/usage';

const SARVAM_API_KEY = process.env.SARVAM_API_KEY ?? '';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text, language } = await request.json() as { text: string; language?: string };
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  // ── English: browser Web Speech API fallback (client handles it) ────────────
  const isEnglish = !language || language.startsWith('en');
  if (isEnglish) {
    return NextResponse.json({ error: 'use browser TTS' }, { status: 503 });
  }

  // ── Hindi / other: Sarvam AI ───────────────────────────────────────────────
  if (!SARVAM_API_KEY) {
    return NextResponse.json({ error: 'Hindi TTS not configured' }, { status: 503 });
  }

  const res = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-Subscription-Key': SARVAM_API_KEY,
    },
    body: JSON.stringify({
      inputs: [text.slice(0, 500)],
      target_language_code: language ?? 'hi-IN',
      speaker: 'anushka',
      model: 'bulbul:v2',
      pitch: 0,
      pace: 0.9,
      loudness: 1.5,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      eng_interpolation_wt: 128,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[TTS] Sarvam API error', res.status, err);
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json() as { audios?: string[] };
  const audio = data.audios?.[0] ?? null;

  if (user && audio) {
    const charCount = text.slice(0, 500).length;
    logCostDirect(user.id, 'tts', 'bulbul:v2', charCount, charCount * SARVAM_COST_PER_CHAR).catch(console.error);
  }

  return NextResponse.json({ audio, format: 'wav' });
}
