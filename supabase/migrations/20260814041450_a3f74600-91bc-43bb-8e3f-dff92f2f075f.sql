ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS job_position text,
  ADD COLUMN IF NOT EXISTS job_level text;

ALTER TABLE public.candidates DROP CONSTRAINT IF EXISTS candidates_job_level_check;
ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_job_level_check
  CHECK (job_level IS NULL OR job_level IN ('staff','spv_up'));

UPDATE public.candidates c
SET job_level = 'staff'
WHERE c.job_level IS NULL
  AND c.data_completed = true
  AND COALESCE((SELECT cc.candidate_type FROM public.candidate_codes cc WHERE cc.id = c.code_id), 'karyawan') = 'karyawan';

ALTER TABLE public.tests DROP CONSTRAINT IF EXISTS tests_audience_check;
ALTER TABLE public.tests
  ADD CONSTRAINT tests_audience_check
  CHECK (audience IN ('magang','karyawan','both','karyawan_staff','karyawan_spv'));