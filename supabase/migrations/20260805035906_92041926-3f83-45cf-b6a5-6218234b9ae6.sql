UPDATE public.test_questions q SET question_text = v.txt
FROM (VALUES
 (36, 'Tim bisbol kami kalah 9 permainan dalam musim ini. Ini merupakan 3/8 bagian dari semua pertandingan mereka. Berapa banyak pertandingan yang mereka mainkan dalam musim kompetisi saat ini?'),
 (37, 'Apakah angka selanjutnya dari seri ini?  1   .5   .25   .125   ?'),
 (38, 'Bentuk geometris ini dapat dibagi oleh suatu garis lurus menjadi dua bagian yang dapat disatukan dengan suatu cara hingga membentuk bujur sangkar yang sempurna. Gambarlah garis yang menghubungkan dua dari angka-angka yang ada, lalu tuliskan angka tersebut sebagai jawaban.'),
 (39, 'Apakah arti dari kalimat berikut: 1. sama  2. berlawanan  3. tidak sama atau berlawanan?  "Sebuah sapu yang baru menyapu dengan bersih. Sepatu yang sudah lama sifatnya makin lunak."')
) AS v(num, txt)
JOIN public.tests t ON (t.code ILIKE '%wpt%')
WHERE q.test_id = t.id AND q.question_number = v.num;