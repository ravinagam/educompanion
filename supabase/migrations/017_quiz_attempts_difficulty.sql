ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';
