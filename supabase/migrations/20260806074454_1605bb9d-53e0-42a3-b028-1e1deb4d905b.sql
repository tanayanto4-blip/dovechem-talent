DELETE FROM public.test_answers WHERE attempt_id IN (
  SELECT id FROM public.test_attempts WHERE candidate_id = '6b7e051b-010b-48d8-9a35-c5d11f53bd6a'
);
DELETE FROM public.test_attempts WHERE candidate_id = '6b7e051b-010b-48d8-9a35-c5d11f53bd6a';
UPDATE public.candidates SET school_name = NULL, major = NULL, phone = NULL, email = NULL,
  position_applied = NULL, work_experience = NULL, gender = NULL, education = NULL,
  nik = NULL, birth_place = NULL, birth_date = NULL, address = NULL, marital_status = NULL,
  data_completed = false
WHERE id = '6b7e051b-010b-48d8-9a35-c5d11f53bd6a';