-- Tracks every visit to /join?ref=CODE so we can compute click → signup conversion rates.
-- Written via service role only; no RLS needed.
CREATE TABLE public.referral_clicks (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code TEXT        NOT NULL,
  clicked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent    TEXT
);

CREATE INDEX idx_referral_clicks_code ON public.referral_clicks(referral_code);
