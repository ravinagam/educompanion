import { NextRequest, NextResponse } from 'next/server';

const SARVAM_API_KEY = process.env.SARVAM_API_KEY ?? '';

export async function POST(request: NextRequest) {
  if (!SARVAM_API_KEY) {
    return NextResponse.json({ error: 'TTS not configured' }, { status: 503 });
  }

  const { text, language } = await request.json() as { text: string; language?: string };
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  const res = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-Subscription-Key': SARVAM_API_KEY,
    },
    body: JSON.stringify({
      inputs: [text.slice(0, 500)],
      target_language_code: language ?? 'hi-IN',
      speaker: 'meera',
      model: 'bulbul:v1',
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
  console.log('[TTS] Sarvam success, audio length:', audio?.length ?? 0);
  return NextResponse.json({ audio });
}
