INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tts-cache',
  'tts-cache',
  FALSE,
  2097152,  -- 2 MB per file
  ARRAY['audio/wav', 'audio/wave']
) ON CONFLICT (id) DO NOTHING;
