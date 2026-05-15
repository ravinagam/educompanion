-- Allow parents (who exist in auth.users but not public.users) to submit feedback.
-- Drop the FK constraint to public.users and replace it with one to auth.users.
ALTER TABLE public.feedback
  DROP CONSTRAINT feedback_user_id_fkey;

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
