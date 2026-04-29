CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.users(id) ON DELETE CASCADE,
  feature       TEXT NOT NULL,
  model         TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd      NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id    ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
-- No student-facing policies — only service role (admin client) can insert/read
