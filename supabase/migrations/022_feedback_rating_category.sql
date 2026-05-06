ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS rating   integer CHECK (rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS category text    CHECK (category IN ('bug', 'suggestion', 'ui', 'love', 'activity'));
