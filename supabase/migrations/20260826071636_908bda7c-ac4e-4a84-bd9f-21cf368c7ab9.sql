ALTER TABLE public.tests DISABLE TRIGGER tests_guard_hr_update;
UPDATE public.tests SET name='Test Koran' WHERE test_type='pauli';
UPDATE public.tests SET name='Cognitive Ability Test' WHERE test_type='wpt';
UPDATE public.tests SET name='Personality Test' WHERE test_type='mbti';
UPDATE public.tests SET name='Emotional Intelligence Test' WHERE test_type='eq';
UPDATE public.tests SET name='Disc Test' WHERE test_type='disc';
UPDATE public.tests SET name='Papikostik' WHERE test_type='papi';
UPDATE public.tests SET name='Color Blindness' WHERE test_type='ishihara';
ALTER TABLE public.tests ENABLE TRIGGER tests_guard_hr_update;