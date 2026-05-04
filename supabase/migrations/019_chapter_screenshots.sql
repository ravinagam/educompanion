ALTER TABLE public.chapters
  ADD COLUMN source_type TEXT NOT NULL DEFAULT 'file'
    CHECK (source_type IN ('file', 'screenshots')),
  ADD COLUMN screenshot_urls TEXT[];
