-- Add voucher tracking columns to gift milestones table
ALTER TABLE public.user_gift_milestones
  ADD COLUMN IF NOT EXISTS voucher_code     TEXT,
  ADD COLUMN IF NOT EXISTS voucher_sent_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS availed_at       TIMESTAMPTZ;
