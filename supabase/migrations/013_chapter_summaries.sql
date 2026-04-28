CREATE TABLE IF NOT EXISTS public.chapter_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  summary_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chapter_summaries_chapter_id_unique UNIQUE (chapter_id)
);

ALTER TABLE public.chapter_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own chapter summaries"
  ON public.chapter_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.subjects s ON c.subject_id = s.id
      WHERE c.id = chapter_summaries.chapter_id
        AND s.user_id = auth.uid()
    )
  );
