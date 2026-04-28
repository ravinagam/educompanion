-- Fix: add UNIQUE constraint on video_scripts.chapter_id
-- First remove any duplicate rows (keep the most recent per chapter)
DELETE FROM public.video_scripts
WHERE id NOT IN (
  SELECT DISTINCT ON (chapter_id) id
  FROM public.video_scripts
  ORDER BY chapter_id, created_at DESC
);

ALTER TABLE public.video_scripts
  ADD CONSTRAINT video_scripts_chapter_id_unique UNIQUE (chapter_id);
