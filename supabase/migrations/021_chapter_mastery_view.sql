-- View: chapter mastery per user
-- Mastered = quiz attempt ≥ 60% score AND ≥ 3 flashcards marked 'known'
CREATE OR REPLACE VIEW public.chapter_mastery AS
SELECT
  qa.user_id,
  q.chapter_id,
  TRUE AS quiz_done,
  COALESCE(fc.known_count, 0) AS flashcards_known,
  CASE WHEN COALESCE(fc.known_count, 0) >= 3 THEN TRUE ELSE FALSE END AS flashcards_done,
  CASE
    WHEN COALESCE(fc.known_count, 0) >= 3 THEN TRUE
    ELSE FALSE
  END AS mastered
FROM (
  -- Best quiz attempt per user per quiz
  SELECT DISTINCT ON (user_id, quiz_id)
    user_id, quiz_id, score, total,
    CASE WHEN total > 0 THEN score::float / total ELSE 0 END AS pct
  FROM public.quiz_attempts
  ORDER BY user_id, quiz_id, pct DESC
) qa
JOIN public.quizzes q ON q.id = qa.quiz_id
LEFT JOIN (
  SELECT fp.user_id, f.chapter_id, COUNT(*) AS known_count
  FROM public.flashcard_progress fp
  JOIN public.flashcards f ON f.id = fp.flashcard_id
  WHERE fp.status = 'known'
  GROUP BY fp.user_id, f.chapter_id
) fc ON fc.user_id = qa.user_id AND fc.chapter_id = q.chapter_id
WHERE qa.pct >= 0.6;
