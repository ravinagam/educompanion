-- Cache for generated Hindi fill-in-the-blank worksheets
CREATE TABLE IF NOT EXISTS public.hindi_worksheets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id     UUID NOT NULL UNIQUE REFERENCES public.chapters(id) ON DELETE CASCADE,
  questions_json JSONB NOT NULL,
  generated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hindi_worksheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hindi_worksheets_service_write" ON public.hindi_worksheets
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "hindi_worksheets_read" ON public.hindi_worksheets
  FOR SELECT USING (true);
