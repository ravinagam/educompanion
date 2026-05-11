-- AI-generated parent insights cache (SWOT + recommendations + alerts)
-- Refreshed on-demand, expires after 24 hours
CREATE TABLE public.parent_insights (
  student_id    UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  insights_json JSONB NOT NULL DEFAULT '{}',
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- No student RLS — only accessible via service role (admin client) from API routes
ALTER TABLE public.parent_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on parent_insights"
  ON public.parent_insights FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
