-- Supabase Storage bucket for chapter files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chapter-files',
  'chapter-files',
  FALSE,
  52428800,  -- 50 MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage bucket for rendered videos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'chapter-videos',
  'chapter-videos',
  TRUE,
  524288000  -- 500 MB
) ON CONFLICT (id) DO NOTHING;

-- RLS for chapter-files bucket
CREATE POLICY "Users upload own chapter files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chapter-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own chapter files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chapter-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can read chapter videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chapter-videos');
