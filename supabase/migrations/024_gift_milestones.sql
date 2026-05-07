-- Gift milestone redemption log
-- Tracks which XP milestones each user has already been rewarded for (idempotency guard)
CREATE TABLE public.user_gift_milestones (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_milestone INTEGER NOT NULL,   -- 3000, 6000, or 10000
  voucher_inr  INTEGER NOT NULL,   -- 100, 200, or 400
  gifted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, xp_milestone)
);

ALTER TABLE public.user_gift_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own milestones"
  ON public.user_gift_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages milestones"
  ON public.user_gift_milestones FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX idx_gift_milestones_user_id ON public.user_gift_milestones(user_id);
