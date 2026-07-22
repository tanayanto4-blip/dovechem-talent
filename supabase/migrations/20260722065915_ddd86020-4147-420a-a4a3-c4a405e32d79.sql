ALTER TABLE public.test_questions ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS test_questions_test_id_active_idx ON public.test_questions(test_id, active);