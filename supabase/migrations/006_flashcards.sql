-- Flashcards
CREATE TABLE public.flashcards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id  UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  term        TEXT NOT NULL,
  definition  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read flashcards for own chapters"
  ON public.flashcards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.subjects s ON s.id = c.subject_id
      WHERE c.id = chapter_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages flashcards"
  ON public.flashcards FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_flashcards_chapter_id ON public.flashcards(chapter_id);

-- Flashcard progress (SRS tracking per user)
CREATE TABLE public.flashcard_progress (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  flashcard_id   UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('known', 'unknown')),
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  review_count   INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, flashcard_id)
);

ALTER TABLE public.flashcard_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own flashcard progress"
  ON public.flashcard_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_flashcard_progress_user_id ON public.flashcard_progress(user_id);
CREATE INDEX idx_flashcard_progress_flashcard_id ON public.flashcard_progress(flashcard_id);
CREATE INDEX idx_flashcard_progress_next_review ON public.flashcard_progress(next_review_at);

CREATE TRIGGER flashcard_progress_updated_at
  BEFORE UPDATE ON public.flashcard_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
