-- Helper: similarity search for chapter content
CREATE OR REPLACE FUNCTION match_chapter_chunks(
  p_query_embedding vector(1536),
  p_chapter_id      UUID,
  p_match_count     INT DEFAULT 5
)
RETURNS TABLE (
  id         UUID,
  chunk_text TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.chunk_text,
    1 - (ce.embedding_vector <=> p_query_embedding) AS similarity
  FROM public.chapter_embeddings ce
  WHERE ce.chapter_id = p_chapter_id
  ORDER BY ce.embedding_vector <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- Helper: get today's study plans for a user
CREATE OR REPLACE FUNCTION get_today_study_plans(p_user_id UUID)
RETURNS TABLE (
  plan_id           UUID,
  test_id           UUID,
  test_name         TEXT,
  chapter_id        UUID,
  chapter_name      TEXT,
  topics            TEXT[],
  estimated_minutes INTEGER,
  is_completed      BOOLEAN,
  urgency           TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id              AS plan_id,
    t.id               AS test_id,
    t.name             AS test_name,
    c.id               AS chapter_id,
    c.name             AS chapter_name,
    sp.topics,
    sp.estimated_minutes,
    sp.is_completed,
    CASE
      WHEN (t.test_date - CURRENT_DATE) <= 1 THEN 'red'
      WHEN (t.test_date - CURRENT_DATE) <= 3 THEN 'amber'
      ELSE 'green'
    END AS urgency
  FROM public.study_plans sp
  JOIN public.tests t ON t.id = sp.test_id
  JOIN public.chapters c ON c.id = sp.chapter_id
  WHERE t.user_id = p_user_id
    AND sp.day_date = CURRENT_DATE
  ORDER BY urgency DESC, sp.estimated_minutes DESC;
END;
$$;

-- Helper: chapter mastery percentage
CREATE OR REPLACE FUNCTION get_chapter_mastery(p_user_id UUID, p_chapter_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_total  INTEGER;
  v_known  INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM public.flashcards f WHERE f.chapter_id = p_chapter_id;

  IF v_total = 0 THEN RETURN 0; END IF;

  SELECT COUNT(*) INTO v_known
  FROM public.flashcard_progress fp
  JOIN public.flashcards f ON f.id = fp.flashcard_id
  WHERE f.chapter_id = p_chapter_id
    AND fp.user_id = p_user_id
    AND fp.status = 'known';

  RETURN ROUND((v_known::NUMERIC / v_total::NUMERIC) * 100, 1);
END;
$$;
