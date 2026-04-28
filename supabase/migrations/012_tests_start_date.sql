-- Allow users to choose when their study plan starts
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS plan_start_date DATE;

COMMENT ON COLUMN public.tests.plan_start_date IS
  'The date the study plan schedule begins (defaults to day after creation if null)';
