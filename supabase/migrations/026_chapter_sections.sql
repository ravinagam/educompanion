-- Chapter sections: AI-split subsections of a chapter
CREATE TABLE public.chapter_sections (
  id                UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id        UUID     NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title             TEXT     NOT NULL,
  content_text      TEXT     NOT NULL,
  order_index       SMALLINT NOT NULL,
  estimated_minutes SMALLINT NOT NULL DEFAULT 10,
  mini_quiz_json    JSONB,   -- generated lazily on first student visit
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chapter_sections ENABLE ROW LEVEL SECURITY;

-- Inherit ownership through chapters → subjects
CREATE POLICY "Users read own chapter sections"
  ON public.chapter_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.subjects s ON s.id = c.subject_id
      WHERE c.id = chapter_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages chapter sections"
  ON public.chapter_sections FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_chapter_sections_chapter_id ON public.chapter_sections(chapter_id);
CREATE INDEX idx_chapter_sections_order ON public.chapter_sections(chapter_id, order_index);

-- Per-user section progress
CREATE TABLE public.section_progress (
  user_id       UUID     NOT NULL REFERENCES auth.users(id)            ON DELETE CASCADE,
  section_id    UUID     NOT NULL REFERENCES public.chapter_sections(id) ON DELETE CASCADE,
  read_done     BOOLEAN  NOT NULL DEFAULT FALSE,
  chat_done     BOOLEAN  NOT NULL DEFAULT FALSE,
  quiz_score    SMALLINT,          -- 0–100, NULL = not attempted
  completed_at  TIMESTAMPTZ,       -- set when all 3 steps done
  PRIMARY KEY (user_id, section_id)
);

ALTER TABLE public.section_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own section progress"
  ON public.section_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
