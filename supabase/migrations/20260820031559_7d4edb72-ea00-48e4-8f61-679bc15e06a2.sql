UPDATE public.test_questions q
SET correct_answer = '-',
    question_text = 'Tuliskan angka yang Anda lihat pada gambar berikut. Jika tidak ada angka yang terlihat, cukup tulis tanda strip ( - ).'
FROM public.tests t
WHERE t.id = q.test_id AND t.test_type = 'ishihara'
  AND q.question_number IN (4, 7, 10, 13);

UPDATE public.test_questions q
SET question_text = 'Tuliskan angka yang Anda lihat pada gambar berikut. Jika tidak ada angka yang terlihat, cukup tulis tanda strip ( - ).'
FROM public.tests t
WHERE t.id = q.test_id AND t.test_type = 'ishihara';