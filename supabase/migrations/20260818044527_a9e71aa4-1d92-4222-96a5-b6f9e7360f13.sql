INSERT INTO public.tests (id, code, name, description, test_type, duration_minutes, audience, active)
VALUES ('7b1c9f10-2d4a-4f6e-9c3b-5a1e8d0f2b47', 'RMIB', 'RMIB — Rothwell-Miller Interest Blank', 'Tes minat pekerjaan: 9 kelompok x 12 pekerjaan, kandidat memberi peringkat 1-12 pada tiap kelompok.', 'rmib', 30, 'both', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, test_type = EXCLUDED.test_type, description = EXCLUDED.description, duration_minutes = EXCLUDED.duration_minutes, active = true;

DELETE FROM public.test_questions WHERE test_id = '7b1c9f10-2d4a-4f6e-9c3b-5a1e8d0f2b47';

INSERT INTO public.test_questions (test_id, question_number, question_text, options)
SELECT '7b1c9f10-2d4a-4f6e-9c3b-5a1e8d0f2b47',
       n,
       'Kelompok ' || c || ' — beri peringkat 1 (paling disukai) sampai 12 (paling tidak disukai).',
       jsonb_build_object('code', c)
FROM (VALUES (1,'A'),(2,'B'),(3,'C'),(4,'D'),(5,'E'),(6,'F'),(7,'G'),(8,'H'),(9,'I')) AS g(n, c);