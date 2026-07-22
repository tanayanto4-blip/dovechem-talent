
DO $$
DECLARE
  v_test_id uuid;
  v_questions text[] := ARRAY[
    'Bulan lalu pada awal tahun ini adalah: 1. Januari  2. Maret  3. Juli  4. Desember  5. Oktober',
    'MENANGKAP adalah lawan kata dari: 1. meletakkan  2. membebaskan  3. beresiko  4. berusaha  5. turun tingkat',
    'Sebagian besar hal berikut serupa satu sama lain. Manakah yang kurang serupa dengan yang lain? 1. Januari  2. Agustus  3. Rabu  4. Oktober  5. Desember',
    'Jawablah dengan menuliskan YA atau TIDAK. Apakah RSVP berarti "jawablah yang tidak perlu"?',
    'Dalam kelompok kata berikut, manakah kata yang berbeda dari kata yang lain? 1. pasukan  2. liga  3. berpartisipasi  4. pak  5. kelompok',
    'BIASA adalah lawan kata dari: 1. jarang  2. terbiasa  3. tetap  4. berhenti  5. selalu',
    'Gambar manakah yang terbuat dari dua gambar di dalam tanda kurung? (lihat gambar pada soal asli — jawab dengan nomor gambar)',
    'Perhatikan urutan angka berikut. Angka berapa yang selanjutnya muncul?  8, 4, 2, 1, 1/2, 1/4, ?',
    'KLIEN dan PELANGGAN — Apakah kata-kata ini: 1. memiliki arti yang sama  2. memiliki arti berlawanan  3. tidak memiliki arti sama atau berlawanan?',
    'Manakah kata berikut yang berhubungan dengan aroma saat gigi mengunyah? 1. manis  2. bau tak sedap  3. bau wangi  4. hidung  5. bersih',
    'MUSIM GUGUR adalah lawan dari: 1. liburan  2. musim panas  3. musim semi  4. musim dingin  5. musim gugur',
    'Sebuah pesawat terbang 300 kaki dalam 1/2 detik. Pada kecepatan yang sama, berapa kaki ia terbang dalam 10 detik?',
    'Anggaplah dua pernyataan pertama benar. Apakah pernyataan terakhir 1. benar  2. salah  3. tidak tahu?  "Anak-anak lelaki ini adalah anak yang normal. Semua anak normal sifatnya aktif. Anak-anak lelaki ini aktif."',
    'JAUH adalah lawan kata dari: 1. terpencil  2. dekat  3. jauh  4. terburu-buru  5. pasti',
    '3 permen lemon seharga 10 rupiah. Berapa harga 1/2 lusin?',
    'Berapa banyak duplikasi (pasangan yang identik) dari lima pasangan angka berikut?  84721 / 84721   9210651 / 9210561   14201201 / 14210210   96101101 / 96101161   88884444 / 88884444',
    'Misalkan Anda menyusun kata-kata berikut sehingga menjadi pernyataan yang benar. Lalu tuliskan huruf terakhir dari kata terakhir sebagai jawaban.  "Selalu sebuah kata kerja kalimat suatu memiliki"',
    'Anak lelaki berumur 5 tahun dan saudara perempuannya dua kali lebih tua. Ketika anak lelaki itu berumur 8 tahun, berapa umur saudara perempuannya?',
    'IT''S dan ITS — Apakah kata ini: 1. memiliki arti yang sama  2. memiliki arti yang berlawanan  3. tidak memiliki arti yang sama atau berlawanan?',
    'Anggaplah dua pernyataan pertama benar. Apakah pernyataan terakhir 1. benar  2. salah  3. tidak tahu?  "John seusia dengan Sally. Sally lebih muda dari Bill. John lebih muda dari Bill."',
    'Seorang dealer membeli beberapa barrel seharga 4.000 rupiah. Ia menjual dengan harga 5.000 rupiah, mendapat untung 50 rupiah setiap barrel. Berapa banyak barrel yang dijual?',
    'Misalkan Anda menyusun kata-kata berikut sehingga menjadi kalimat lengkap. Jika kalimat itu benar tulislah B, jika salah tulislah S.  "telur menghasilkan semua ayam"',
    'Dua dari peribahasa berikut memiliki arti sama. Manakah?  1. Semakin banyak memiliki sapi, akan memiliki satu anak sapi yang buruk.  2. Anak seperti Ayahnya.  3. Bila tertinggal sama jauhnya dengan satu mil.  4. Seorang dikenal dari persahabatan yang dijalin.  5. Mereka adalah benih dari mangkuk yang sama.',
    'Sebuah jam terlambat 1 menit 18 detik dalam 39 hari. Berapa detik ia terlambat dalam sehari?',
    'CANVASS dan CANVAS — Apakah kata-kata ini: 1. memiliki arti yang sama  2. memiliki arti yang berlawanan  3. tidak memiliki arti sama atau berlawanan?',
    'Anggaplah dua pernyataan pertama benar. Pernyataan terakhir 1. benar  2. salah  3. tidak tahu?  "Semua siswa mengikuti ujian. Beberapa orang di ruangan ini adalah siswa. Beberapa orang di ruangan ini mengikuti ujian."',
    'Dalam 30 hari seseorang menabung 1 dolar. Berapa rata-rata tabungannya setiap hari?',
    'INGENIOUS dan INGENUOUS — Apakah kata-kata ini: 1. memiliki arti sama  2. memiliki arti berlawanan  3. tidak memiliki arti sama atau berlawanan?',
    'Dua orang menangkap 36 ikan. X menangkap 5 kali lebih banyak dari Y. Berapa ikan yang ditangkap Y?',
    'Sebuah kotak segi empat yang terisi penuh memuat 800 kubik kaki gandum. Jika kotak lebarnya 8 kaki dan panjangnya 10 kaki, berapa kedalaman kotak itu?',
    'Satu angka dari rangkaian berikut tidak cocok dengan pola angka yang lainnya. Angka berapakah itu?  1/2, 1/4, 1/6, 1/8, 1/9, 1/12',
    'Jawablah dengan menulis YA atau TIDAK. Apakah P.M. berarti "post meridiem"?',
    'DAPAT DIPERCAYA dan GAMPANG PERCAYA — Apakah kata-kata ini: 1. memiliki arti sama  2. memiliki arti berlawanan  3. tidak memiliki arti sama atau berlawanan?',
    'Sebuah rok membutuhkan 2 1/4 meter kain. Berapa banyak potong yang dihasilkan dari 45 meter kain?',
    'Sebuah jam menunjuk tepat pukul 12 siang pada hari Senin. Pada pukul 2 siang hari Rabu jam itu terlambat 26 detik. Pada rata-rata yang sama, berapa banyak jam itu terlambat dalam 1/2 jam?',
    'Sebuah bujur sangkar dibagi menjadi bagian-bagian. Berapa bagian yang dihasilkan? (lihat gambar pada soal asli)',
    'Anggaplah dua pernyataan pertama benar. Pernyataan terakhir 1. benar  2. salah  3. tidak tahu?  "Beberapa pengusaha adalah dokter. Beberapa dokter adalah pemain golf. Beberapa pengusaha adalah pemain golf."',
    'Manakah dari lima peribahasa berikut yang paling mirip artinya dengan: "Waktu adalah uang"?  1. Habis manis sepah dibuang  2. Sedia payung sebelum hujan  3. Jangan tunda sampai besok apa yang bisa dikerjakan hari ini  4. Sekali dayung dua tiga pulau terlampaui  5. Ada gula ada semut',
    'Berapa angka berikutnya dalam rangkaian ini?  3, 8, 14, 21, 29, ?',
    'Berapa duplikasi dari pasangan kata berikut ini?  Rexford, J.D. / Rockford, J.D.   Singleton, M.O. / Simbleten, M.O.   Richards, W.E. / Richad, W.E.   Siegel, A.B. / Seigel, A.B.   Wood, A.O. / Wood, A.O.',
    'Dua dari peribahasa ini memiliki makna yang serupa. Manakah?  1. Anda tidak dapat membuat dompet sutra dari kuping babi betina.  2. Orang yang mencuri telur akan mencuri sapi.  3. Batu yang berguling tidak akan mengumpulkan lumut.  4. Anda tidak mungkin menghancurkan kapal yang sudah rusak.  5. Ini ketidakmungkinan yang terjadi.',
    'Gambar geometris pada soal asli dapat dibagi dengan garis lurus menjadi dua bagian yang dapat disatukan untuk membentuk bujur sangkar sempurna. Hubungkan dua angka pada gambar; tulis pasangan angka tersebut sebagai jawaban.',
    'Dalam kelompok angka berikut, manakah angka yang terkecil?  10   1   .999   .33   11',
    'Apakah makna kalimat berikut: 1. sama  2. berlawanan  3. tidak sama atau berlawanan?  "Tidak ada orang jujur meminta maaf atas kejujurannya. Kejujuran dihormati dan lapar pujian."',
    'Dengan harga 1,80 dolar, seorang grosir membeli satu kardus buah berisi 12 lusin. Ia tahu dua lusin akan busuk sebelum dijual. Dengan harga berapa per lusin ia harus menjual jeruk itu untuk mendapat keuntungan 1/3 dari harga seluruhnya?',
    'Dalam rangkaian kata berikut, manakah kata yang berbeda dari yang lainnya?  1. koloni  2. perkawanan  3. kawanan  4. kru  5. konstelasi',
    'Anggaplah dua pernyataan pertama benar. Apakah pernyataan terakhir 1. benar  2. salah  3. tidak tahu?  "Orang besar dibodohi. Saya dibodohi. Saya adalah orang besar."',
    'Tiga orang membentuk kemitraan dan setuju membagi keuntungan secara rata. X menginvestasi 4.500 dolar, Y sebesar 3.500 dolar, dan Z sebesar 2.000 dolar. Jika keuntungan mencapai 1.500 dolar, berapa lebih atau kurang yang akan diperoleh X dibanding jika keuntungan dibagi berdasarkan besarnya investasi?',
    'Empat dari 5 bagian ini dapat digabungkan untuk membuat segi tiga. Manakah keempat gambar itu? (lihat gambar pada soal asli — jawab dengan nomor gambar)',
    'Untuk mencetak sebuah artikel berisi 30.000 kata, sebuah percetakan memutuskan memakai dua ukuran jenis. Dengan tipe yang lebih besar, satu halaman memuat 1.200 kata; dengan tipe yang lebih kecil, satu halaman memuat 1.500 kata. Artikel ini masuk dalam 22 halaman di majalah. Berapa banyak halaman yang dibutuhkan untuk tipe yang lebih kecil?'
  ];
  i int;
BEGIN
  INSERT INTO public.tests (name, code, description, test_type, duration_minutes, active)
  VALUES (
    'WPT — Wonderlic Personnel Test (Form A)',
    'wpt-form-a',
    'Tes kemampuan pemecahan masalah (50 soal, 12 menit). Kolom jawaban dibiarkan kosong — kandidat mengisi jawaban sendiri pada setiap nomor.',
    'wpt',
    12,
    true
  )
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    test_type = EXCLUDED.test_type,
    duration_minutes = EXCLUDED.duration_minutes,
    active = EXCLUDED.active
  RETURNING id INTO v_test_id;

  DELETE FROM public.test_questions WHERE test_id = v_test_id;

  FOR i IN 1..array_length(v_questions, 1) LOOP
    INSERT INTO public.test_questions (test_id, question_number, question_text, options, correct_answer, active)
    VALUES (v_test_id, i, v_questions[i], NULL, NULL, true);
  END LOOP;
END $$;
