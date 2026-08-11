ALTER TABLE public.candidate_codes
  ADD COLUMN IF NOT EXISTS candidate_type text NOT NULL DEFAULT 'karyawan';

ALTER TABLE public.candidate_codes
  ADD CONSTRAINT candidate_codes_candidate_type_check
  CHECK (candidate_type IN ('magang','karyawan'));

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'both';

ALTER TABLE public.tests
  ADD CONSTRAINT tests_audience_check
  CHECK (audience IN ('magang','karyawan','both'));

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS semester text;