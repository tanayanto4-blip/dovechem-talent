
DO $$
DECLARE
  v_test_id uuid;
  v_stmts text[] := ARRAY[
    'Saya segera menyadari ketika saya kehilangan kesabaran',
    'Saya dapat ''membangun ulang'' situasi buruk dengan cepat',
    'Saya selalu dapat memotivasi diri saya untuk melakukan tugas-tugas yang sulit',
    'Saya selalu dapat melihat sesuatu dari sudut pandang orang lain',
    'Saya pendengar yang sangat baik',
    'Saya tahu kapan saya bahagia',
    'Saya menunjukkan emosi dan perasaan secara terbuka, tanpa menyembunyikannya, sehingga orang lain dapat melihat dan memahami perasaan saya dengan mudah.',
    'Saya biasanya dapat memprioritaskan kegiatan penting di tempat kerja dan melanjutkannya',
    'Saya sangat baik dalam berempati dengan masalah orang lain',
    'Saya tidak pernah mengganggu percakapan orang lain',
    'Saya biasanya mengenali ketika saya stres',
    'Orang lain jarang bisa mengatakan suasana hati saya seperti apa',
    'Saya selalu memenuhi tenggat waktu',
    'Saya tahu jika seseorang tidak senang dengan saya',
    'Saya pandai beradaptasi dan bergaul dengan berbagai orang',
    'Ketika saya menjadi ''emosional'', saya menyadari hal ini',
    'Saya jarang kehilangan kendali dan tiba-tiba menjadi sangat marah kepada orang lain',
    'Saya tidak pernah membuang waktu',
    'Saya dapat mengetahui apakah tim orang lain tidak rukun satu sama lain',
    'Orang-orang adalah hal yang paling menarik dalam hidup bagi saya',
    'Ketika saya merasa cemas, saya biasanya dapat menjelaskan alasannya',
    'Orang-orang sulit tidak membuatku kesal',
    'Saya tidak berpura-pura',
    'Saya biasanya bisa mengerti mengapa orang-orang bersikap keras terhadap saya',
    'Saya suka bertemu orang baru dan mencari tahu apa yang memotivasi mereka',
    'Saya selalu tahu ketika saya bersikap tidak masuk akal',
    'Saya dapat secara sadar mengubah kerangka pikiran atau suasana hati saya',
    'Saya percaya Anda harus melakukan hal-hal sulit terlebih dahulu',
    'Individu lain tidak ''sulit'' hanya ''berbeda''',
    'Saya membutuhkan berbagai rekan kerja untuk membuat pekerjaan saya lebih menarik',
    'Kesadaran akan emosi saya sendiri sangat penting bagi saya setiap saat',
    'Saya tidak membiarkan situasi stres atau orang memengaruhi saya setelah saya meninggalkan pekerjaan',
    'Kepuasan yang tertunda adalah kebajikan yang saya pegang',
    'Saya bisa mengerti jika saya bersikap tidak masuk akal',
    'Saya suka mengajukan pertanyaan untuk mencari tahu apa yang penting bagi orang-orang',
    'Saya dapat mengetahui apakah seseorang telah membuat saya kesal atau kesal',
    'Saya jarang khawatir tentang pekerjaan atau kehidupan secara umum',
    'Saya percaya pada ''Aksi Hari Ini''',
    'Saya dapat memahami mengapa tindakan saya terkadang menyinggung perasaan orang lain',
    'Saya melihat bekerja dengan orang-orang yang sulit hanya sebagai tantangan untuk memenangkan hati mereka',
    'Saya bisa melepaskan kemarahan dengan cepat sehingga tidak lagi mempengaruhi saya',
    'Saya dapat menekan emosi saya ketika saya perlu',
    'Saya selalu bisa memotivasi diri saya sendiri bahkan ketika saya merasa rendah hati',
    'Saya terkadang dapat melihat sesuatu dari sudut pandang orang lain',
    'Saya pandai mendamaikan perbedaan dengan orang lain',
    'Saya tahu apa yang membuat saya bahagia',
    'Orang lain sering tidak tahu bagaimana perasaan saya tentang sesuatu',
    'Motivasi telah menjadi kunci kesuksesan saya',
    'Alasan ketidaksepakatan selalu jelas bagi saya',
    'Saya umumnya membangun hubungan yang solid dengan orang-orang yang bekerja dengan saya'
  ];
  v_dims text[] := ARRAY['SA','ME','MO','EM','SS'];
  v_options jsonb := jsonb_build_array(
    jsonb_build_object('key','1','label','1 — Tidak Terjadi'),
    jsonb_build_object('key','2','label','2 — Jarang Terjadi'),
    jsonb_build_object('key','3','label','3 — Kadang Terjadi'),
    jsonb_build_object('key','4','label','4 — Kebiasaan'),
    jsonb_build_object('key','5','label','5 — Selalu Terjadi')
  );
  i int;
BEGIN
  SELECT id INTO v_test_id FROM public.tests WHERE code = 'EQ-DOVER-50' LIMIT 1;
  IF v_test_id IS NULL THEN
    INSERT INTO public.tests (code, name, description, test_type, duration_minutes, active)
    VALUES (
      'EQ-DOVER-50',
      'EQ — Emotional Quotient (50 item)',
      'Kuesioner kecerdasan emosional 50 pernyataan, skala 1–5 (Likert). Menilai 5 dimensi: Kesadaran Diri, Pengelolaan Emosi, Motivasi, Empati, dan Keterampilan Sosial.',
      'eq',
      20,
      true
    )
    RETURNING id INTO v_test_id;
  END IF;

  DELETE FROM public.test_questions WHERE test_id = v_test_id;

  FOR i IN 1..array_length(v_stmts, 1) LOOP
    INSERT INTO public.test_questions (test_id, question_number, question_text, options, dimension, correct_answer, active)
    VALUES (
      v_test_id,
      i,
      v_stmts[i],
      v_options,
      v_dims[((i - 1) % 5) + 1],
      NULL,
      true
    );
  END LOOP;
END $$;
