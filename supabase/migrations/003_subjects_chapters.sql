-- Subjects
CREATE TABLE public.subjects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subjects"
  ON public.subjects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_subjects_user_id ON public.subjects(user_id);

-- Chapters
CREATE TABLE public.chapters (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id       UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  upload_status    TEXT NOT NULL DEFAULT 'uploading'
                   CHECK (upload_status IN ('uploading', 'processing', 'ready', 'error')),
  content_text     TEXT,
  file_url         TEXT,
  file_name        TEXT,
  file_size_bytes  BIGINT,
  complexity_score NUMERIC(4,2) DEFAULT 5.0, -- 1.0–10.0
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Chapters inherit user ownership through subjects
CREATE POLICY "Users manage own chapters"
  ON public.chapters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = subject_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = subject_id AND s.user_id = auth.uid()
    )
  );

CREATE INDEX idx_chapters_subject_id ON public.chapters(subject_id);
CREATE INDEX idx_chapters_upload_status ON public.chapters(upload_status);

CREATE TRIGGER chapters_updated_at
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Chapter embeddings (pgvector)
CREATE TABLE public.chapter_embeddings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id       UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  chunk_text       TEXT NOT NULL,
  embedding_vector vector(1536),  -- OpenAI text-embedding-3-small / Claude embeddings
  chunk_index      INTEGER NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chapter_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own embeddings"
  ON public.chapter_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.subjects s ON s.id = c.subject_id
      WHERE c.id = chapter_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages embeddings"
  ON public.chapter_embeddings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_embeddings_chapter_id ON public.chapter_embeddings(chapter_id);
-- IVFFlat index for similarity search
CREATE INDEX idx_embeddings_vector
  ON public.chapter_embeddings
  USING ivfflat (embedding_vector vector_cosine_ops)
  WITH (lists = 100);
