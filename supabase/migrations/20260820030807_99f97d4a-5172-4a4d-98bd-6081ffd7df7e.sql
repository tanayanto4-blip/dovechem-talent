UPDATE test_questions q
SET correct_answer = 'tidak terlihat'
FROM tests t
WHERE t.id = q.test_id AND t.test_type = 'ishihara' AND q.question_number IN (4, 10, 13);

UPDATE test_questions q
SET question_text = 'Tuliskan angka yang Anda lihat pada gambar berikut. Jika tidak ada angka yang terlihat, tulis: tidak terlihat.'
FROM tests t
WHERE t.id = q.test_id AND t.test_type = 'ishihara';