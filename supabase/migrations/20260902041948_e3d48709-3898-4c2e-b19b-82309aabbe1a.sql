ALTER TABLE public.candidate_test_access
  ADD COLUMN IF NOT EXISTS extra_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_time_granted_at timestamp with time zone;