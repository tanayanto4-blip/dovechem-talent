-- De-duplicate any existing rows first (keep newest by created_at, fall back to id)
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY attempt_id, question_id
           ORDER BY created_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM public.test_answers
)
DELETE FROM public.test_answers a
USING ranked r
WHERE a.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS test_answers_attempt_question_uidx
  ON public.test_answers (attempt_id, question_id);
