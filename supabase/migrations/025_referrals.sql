-- Referral system: referral codes on users + referrals tracking table

ALTER TABLE public.users
  ADD COLUMN referral_code TEXT UNIQUE,
  ADD COLUMN referred_by   UUID REFERENCES public.users(id);

-- Index for fast lookup by referral code
CREATE INDEX idx_users_referral_code ON public.users (referral_code)
  WHERE referral_code IS NOT NULL;

-- Tracks completed referrals (one row per referred user)
CREATE TABLE public.referrals (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  UUID        NOT NULL REFERENCES public.users(id),
  referred_id  UUID        NOT NULL REFERENCES public.users(id) UNIQUE,
  rewarded_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Referrers can see referrals they originated
CREATE POLICY "Referrers can read own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

-- Service role inserts/updates (applied via admin client in API)
