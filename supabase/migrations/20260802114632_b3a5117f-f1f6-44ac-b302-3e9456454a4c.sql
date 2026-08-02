CREATE INDEX IF NOT EXISTS candidate_codes_code_idx ON public.candidate_codes (code);
CREATE INDEX IF NOT EXISTS candidates_code_id_idx ON public.candidates (code_id);
CREATE INDEX IF NOT EXISTS test_attempts_candidate_test_idx ON public.test_attempts (candidate_id, test_id);
CREATE INDEX IF NOT EXISTS test_attempts_started_at_idx ON public.test_attempts (started_at DESC);
CREATE INDEX IF NOT EXISTS candidate_files_candidate_id_idx ON public.candidate_files (candidate_id);
CREATE INDEX IF NOT EXISTS candidate_test_access_candidate_test_idx ON public.candidate_test_access (candidate_id, test_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON public.audit_logs (actor_id);