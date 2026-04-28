-- Quizzes (one per chapter, regeneratable)
CREATE TABLE public.quizzes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id     UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  questions_json JSONB NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read quizzes for own chapters"
  ON public.quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.subjects s ON s.id = c.subject_id
      WHERE c.id = chapter_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages quizzes"
  ON public.quizzes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_quizzes_chapter_id ON public.quizzes(chapter_id);

CREATE TRIGGER quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Quiz attempts (per student per quiz)
CREATE TABLE public.quiz_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_id      UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score        INTEGER NOT NULL DEFAULT 0,
  total        INTEGER NOT NULL DEFAULT 0,
  answers_json JSONB NOT NULL DEFAULT '{}',  -- { question_id: chosen_answer }
  taken_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own quiz attempts"
  ON public.quiz_attempts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_taken_at ON public.quiz_attempts(taken_at DESC);
