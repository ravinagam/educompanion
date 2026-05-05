-- Gamification: XP, Levels, and Streaks
CREATE TABLE public.user_gamification (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp       INTEGER NOT NULL DEFAULT 0,
  level          INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own gamification"
  ON public.user_gamification FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification"
  ON public.user_gamification FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do everything (needed for server-side award_xp calls)
CREATE POLICY "Service role full access"
  ON public.user_gamification FOR ALL
  USING (auth.role() = 'service_role');
