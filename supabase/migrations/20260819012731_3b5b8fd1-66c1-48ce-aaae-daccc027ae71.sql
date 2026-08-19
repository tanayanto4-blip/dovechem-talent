UPDATE public.candidates
SET code_id = '83613c6f-245c-4db9-b78a-44492a1377e2'
WHERE id = '20abfbe9-0ff5-47e1-b51e-68ac930c5bdb';

UPDATE public.candidate_codes
SET active = true,
    active_device_token = NULL,
    active_device_at = NULL,
    expires_at = NULL
WHERE id = '83613c6f-245c-4db9-b78a-44492a1377e2';

UPDATE public.candidate_test_access
SET is_open = true
WHERE candidate_id = '20abfbe9-0ff5-47e1-b51e-68ac930c5bdb' AND is_open = false;