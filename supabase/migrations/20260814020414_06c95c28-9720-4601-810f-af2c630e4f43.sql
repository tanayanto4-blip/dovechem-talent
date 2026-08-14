DO $$
DECLARE t_id uuid;
BEGIN
  INSERT INTO public.tests (code, name, description, test_type, duration_minutes, audience, active)
  VALUES ('BUTA_WARNA', 'Tes Buta Warna (Ishihara)', 'Tes penglihatan warna: kandidat menuliskan angka yang terlihat pada setiap lembar plate warna.', 'ishihara', 5, 'both', true)
  RETURNING id INTO t_id;

  INSERT INTO public.test_questions (test_id, question_number, question_text, options, correct_answer, active) VALUES
    (t_id, 1, 'Tuliskan angka yang Anda lihat pada gambar berikut.', '{"input":"text"}'::jsonb, '12', true),
    (t_id, 2, 'Tuliskan angka yang Anda lihat pada gambar berikut.', '{"input":"text"}'::jsonb, '8', true),
    (t_id, 3, 'Tuliskan angka yang Anda lihat pada gambar berikut.', '{"input":"text"}'::jsonb, '29', true),
    (t_id, 4, 'Tuliskan angka yang Anda lihat pada gambar berikut.', '{"input":"text"}'::jsonb, '5', true),
    (t_id, 5, 'Tuliskan angka yang Anda lihat pada gambar berikut.', '{"input":"text"}'::jsonb, '3', true),
    (t_id, 6, 'Tuliskan angka yang Anda lihat pada gambar berikut.', '{"input":"text"}'::jsonb, '15', true),
    (t_id, 7, 'Tuliskan angka yang Anda lihat pada gambar berikut.', '{"input":"text"}'::jsonb, '74', true),
    (t_id, 8, 'Tuliskan angka yang Anda lihat pada gambar berikut.', '{"input":"text"}'::jsonb, '6', true),
    (t_id, 9, 'Tuliskan angka yang Anda lihat pada gambar berikut.', '{"input":"text"}'::jsonb, '45', true),
    (t_id, 10, 'Tuliskan angka yang Anda lihat pada gambar berikut. Jika tidak ada angka yang terlihat, tulis: tidak terlihat.', '{"input":"text"}'::jsonb, '7', true),
    (t_id, 11, 'Tuliskan angka yang Anda lihat pada gambar berikut. Jika tidak ada angka yang terlihat, tulis: tidak terlihat.', '{"input":"text"}'::jsonb, '16', true),
    (t_id, 12, 'Tuliskan angka yang Anda lihat pada gambar berikut. Jika tidak ada angka yang terlihat, tulis: tidak terlihat.', '{"input":"text"}'::jsonb, '35', true),
    (t_id, 13, 'Tuliskan angka yang Anda lihat pada gambar berikut. Jika tidak ada angka yang terlihat, tulis: tidak terlihat.', '{"input":"text"}'::jsonb, '96', true),
    (t_id, 14, 'Tuliskan angka yang Anda lihat pada gambar berikut. Jika tidak ada angka yang terlihat, tulis: tidak terlihat.', '{"input":"text"}'::jsonb, '2', true);
END $$;