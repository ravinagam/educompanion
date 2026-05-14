-- Chapter images extracted from PDF uploads
CREATE TABLE IF NOT EXISTS public.chapter_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id    UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  page_num      INT  NOT NULL,
  order_idx     INT  NOT NULL DEFAULT 0,
  width         INT,
  height        INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chapter_images_chapter_id_idx ON public.chapter_images(chapter_id, order_idx);

ALTER TABLE public.chapter_images ENABLE ROW LEVEL SECURITY;

-- Students can read images for chapters they have access to (same policy as chapters)
CREATE POLICY "chapter_images_read" ON public.chapter_images
  FOR SELECT USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "chapter_images_service_write" ON public.chapter_images
  FOR ALL USING (auth.role() = 'service_role');

-- Storage bucket for chapter images
INSERT INTO storage.buckets (id, name, public)
  VALUES ('chapter-images', 'chapter-images', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "chapter_images_storage_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'chapter-images');

CREATE POLICY "chapter_images_storage_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chapter-images' AND auth.role() = 'service_role');
