UPDATE public.test_questions
SET question_text = '[IMG:/__l5e/assets-v1/78d1be17-12ab-41b9-b54e-79ac40267386/wpt-q7.jpg]' || COALESCE(question_text,'')
WHERE test_id IN (SELECT id FROM public.tests WHERE test_type='wpt')
  AND question_number = 7
  AND position('[IMG:' in COALESCE(question_text,'')) = 0;

UPDATE public.test_questions
SET question_text = '[IMG:/__l5e/assets-v1/e6691f15-e35f-4a37-a97d-68e65c3cac99/wpt-q49.jpg]' || COALESCE(question_text,'')
WHERE test_id IN (SELECT id FROM public.tests WHERE test_type='wpt')
  AND question_number = 49
  AND position('[IMG:' in COALESCE(question_text,'')) = 0;