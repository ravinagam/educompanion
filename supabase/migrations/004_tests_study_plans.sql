-- Tests (periodic tests)
CREATE TABLE public.tests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  test_date   DATE NOT NULL,
  chapter_ids UUID[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tests"
  ON public.tests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_tests_user_id ON public.tests(user_id);
CREATE INDEX idx_tests_test_date ON public.tests(test_date);

CREATE TRIGGER tests_updated_at
  BEFORE UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Study plans (day-by-day breakdown per test)
CREATE TABLE public.study_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id           UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  day_date          DATE NOT NULL,
  chapter_id        UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  topics            TEXT[] NOT NULL DEFAULT '{}',
  estimated_minutes INTEGER NOT NULL DEFAULT 30,
  is_completed      BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own study plans"
  ON public.study_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_id AND t.user_id = auth.uid()
    )
  );

CREATE INDEX idx_study_plans_test_id ON public.study_plans(test_id);
CREATE INDEX idx_study_plans_day_date ON public.study_plans(day_date);
CREATE INDEX idx_study_plans_chapter_id ON public.study_plans(chapter_id);
