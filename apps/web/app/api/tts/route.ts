import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logCostDirect, SARVAM_COST_PER_CHAR } from '@/lib/ai/usage';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const SARVAM_API_KEY = process.env.SARVAM_API_KEY ?? '';

// ─── English TTS via Microsoft Edge Neural (AriaNeural, no API key needed) ───
async function msEdgeTTS(text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata('en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);
  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk as Buffer);
  }
  tts.close();
  return Buffer.concat(chunks);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text, language } = await request.json() as { text: string; language?: string };
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  // ── English: Microsoft AriaNeural (free, no key, high quality) ─────────────
  const isEnglish = !language || language.startsWith('en');
  if (isEnglish) {
    try {
      const audioBuffer = await msEdgeTTS(text.slice(0, 600));
      const audio = audioBuffer.toString('base64');
      return NextResponse.json({ audio, format: 'mp3' });
    } catch (err) {
      console.error('[TTS] MsEdge error:', err);
      return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
    }
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
