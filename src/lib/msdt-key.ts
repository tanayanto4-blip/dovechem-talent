/**
 * MSDT — Management Style Diagnosis Test (Reddin), 64 item forced-choice A/B.
 *
 * Skoring mengikuti template Excel resmi PT Dover Chemical
 * (sheet "Soal" -> sheet "Otomatis Scoring"):
 *  - 64 jawaban disusun pada grid 8 baris x 8 kolom (urut nomor soal).
 *  - Untuk kolom ke-j: A(j) = jumlah jawaban "A" pada BARIS ke-j,
 *    B(j) = jumlah jawaban "B" pada KOLOM ke-j.
 *  - JUMLAH(j) = A(j) + B(j) + KOREKSI(j).
 *  - Delapan kolom mewakili gaya: Ds, Mi, Au, Co, Bu, Dv, Ba, E.
 *  - TO / RO / E(fektivitas) / O dijumlahkan dari gaya terkait, lalu
 *    dikonversi ke skala 0-4 dan menentukan gaya kepemimpinan dominan.
 */

export type MsdtItem = { n: number; cell: string; a: string; b: string };

export const MSDT_ITEMS: MsdtItem[] = [
  { n: 1, cell: "M15", a: "Saya mengabaikan pelanggar-pelanggar peraturan bila saya merasa pasti bahwa tidak ada satu orangpun yang mengetahui tentang pelanggar-pelanggar tersebut.", b: "Bila saya mengumumkan suatu keputusan yang kurang menyenangkan, saya akan menjelaskan kepada bawahan saya bahwa keputusan ini dibuat oleh Direktur." },
  { n: 2, cell: "M21", a: "Bila ada seorang karyawan yang hasil kerjanya selalu tidak memuaskan saya, saya akan menunggu suatu kesempatan untuk memindahkannya dan bukan untuk memecatnya.", b: "Bila ada bawahan saya yang dikucilkan dari kelompok kerjanya, saya akan mencarikan cara-cara agar supaya orang lain dapat berteman dengannya." },
  { n: 3, cell: "M27", a: "Bila Direktur memberikan perintah yang kurang menyenangkan, saya pikir adalah cukup bijaksana bila saya menyebutkan namanya dan bukan nama saya.", b: "Saya biasanya membuat keputusan-keputusan saya sendiri dan menyampaikannya kepada bawahan saya." },
  { n: 4, cell: "M33", a: "Bila saya ditegur oleh atasan saya, saya akan memanggil semua bawahan saya dan mengatakan semua teguran tersebut kepada mereka.", b: "Saya selalu memberikan tugas-tugas yang sangat sulit kepada karyawan-karyawan yang paling berpengalaman" },
  { n: 5, cell: "M39", a: "Saya selalu melakukan diskusi-diskusi untuk mencapai kata sepakat.", b: "Saya selalu menganjurkan kepada bawahan saya untuk memberikan usul-usul, tetapi kadang-kadang juga saya langsung membuat suatu tindakan tertentu." },
  { n: 6, cell: "M45", a: "Kadang-kadang saya berpikir bahwa perasaan-perasaan saya dan sikap-sikap saya adalah mementingkan tugas saya.", b: "Saya mengijinkan bawahan-bawahan saya untuk ikut serta mengambil keputusan yang dibuat berdasarkan atas suara terbanyak." },
  { n: 7, cell: "M51", a: "Bila jumlah dan mutu hasil kerja bagian saya tidak memuaskan, saya menjelaskan kepada bawahan-bawahan saya bahwa Direktur merasa kecewa dan oleh karena itu mereka harus memperbaiki kerja mereka.", b: "Saya membuat keputusan-keputusan sendiri dan kemudian saya mencoba untuk menjual keputusan-keputusan itu kepada bawahan saya." },
  { n: 8, cell: "M57", a: "Bila saya mengumumkan suatu keputusan yang kurang menyenangkan, saya akan menjelaskan kepada bawahan saya bahwa keputusan ini dibuat oleh Direktur.", b: "Saya mengijinkan bawahan-bawahan saya untuk ikut serta di dalam pengambilan keputusan, tetapi sayapun menyediakan sesuatu keputusan terakhir." },
  { n: 9, cell: "M63", a: "Saya akan memberikan tugas-tugas yang sulit kepada bawahan saya yang belum berpengalaman, tetapi bila mereka memperoleh kesukaran, saya akan mengambil alih tanggung jawab mereka.", b: "Bila jumlah dan mutu hasil kerja bagian saya tidak memuaskan, saya menjelaskan kepada bawahan-bawahan saya bahwa Direktur merasa kecewa dan oleh karena itu mereka harus memperbaiki mutu kerja mereka itu." },
  { n: 10, cell: "M69", a: "Saya merasa bahwa adalah penting agar bawahan-bawahan menyukai saya apabila saya bekerja keras untuk mereka.", b: "Saya membiarkan orang-orang lain menangani tugas-tugas mereka masing-masing, walaupun mereka membuat banyak kesalahan." },
  { n: 11, cell: "M75", a: "Saya menunjukkan minat saya terhadap kehidupan pribadi bawahan-bawahan saya, sebab saya merasa bahwa saya mengerti mengapa mereka mengerjakan sesuatu hal sejauh mereka mengerjakan hal tersebut.", b: "Saya saya merasa bahwa adalah tidak terlalu perlu untuk bawahan-bawahan saya mengerti mengapa mereka mengerjakan sesuatu hal sejauh mereka mengerjakan hal tersebut." },
  { n: 12, cell: "M81", a: "Saya percaya bahwa bawahan-bawahan yang disiplin tidak akan memperbaiki jumlah atau mutu kerja mereka di dalam jangka waktu yang panjang.", b: "Bila menghadapi masalah yang sulit, saya berusaha untuk mencapai pemecahan yang paling sedikit bisa diterima oleh sebagian besar orang-orang yang bersangkutan." },
  { n: 13, cell: "M87", a: "Saya berpikir bahwa bila beberapa bawahan saya merasa tidak berbahagia, saya akan mencoba melakukan sesuatu mengenai hal tersebut.", b: "Saya mengurusi pekerjaan saya sendiri dan saya merasa bahwa pekerjaan saya itu bisa mencapai “Dewan Direksi” untuk mengembangkan ide-ide baru." },
  { n: 14, cell: "M93", a: "Saya menyetujui kenaikan tunjangan-tunjangan untuk staf dan karyawan.", b: "Saya menunjukkan persetujuan untuk meningkatkan pengetahuan tentang pekerjaan dan perusahaan dari bawahanbawahan saya, walaupun hal itu sebenarnya belum diperlukan untuk kedudukan mereka sekarang." },
  { n: 15, cell: "M99", a: "Saya membiarkan orang-orang lain menangani tugas-tugas mereka masing-masing, walaupun mereka membuat banyak kesalahan.", b: "Saya membuat keputusan-keputusan sendiri tetapi saya akan mempertimbangkan usul-usul yang masuk di akal dari bawahanbawahan saya yang untuk memperbaiki keputusan tersebut apabila saya bertanya kepada mereka." },
  { n: 16, cell: "M105", a: "Bila ada bawahan saya yang dikucilkan dari kelompok kerjanya, saya akan mencarikan cara-cara agar supaya orang lain dapat berteman dengannya.", b: "Bila seorang karyawan tidak sanggup menyelesaikan tugasnya, saya akan membantu dia untuk menyelesaikan tugas tersebut" },
  { n: 17, cell: "M111", a: "Saya percaya bahwa suatu penerapan disiplin adalah merupakan seperangkat contoh untuk karyawan-karyawan lainnya.", b: "Kadang-kadang saya berpikir bahwa perasaan-perasaan saya dan sikap-sikap saya adalah mementingkan tugas saya." },
  { n: 18, cell: "M117", a: "Saya mencela pembicaraan-pembicaraan yang tidak perlu di antara bawahan-bawahan saya selama mereka bekerja.", b: "Saya menyetujui tunjangan-tunjangan untuk staf dan karyawankaryawan." },
  { n: 19, cell: "M123", a: "Saya selalu memperhatikan mengenai keterlambatan dan kemangkiran.", b: "Saya percaya bahwa Serikat-Serikat Buruh akan mencoba untuk meruntuhkan kewibawaan pimpinan perusahaan." },
  { n: 20, cell: "M129", a: "Kadang-kadang saya menentang keluhan-keluhan serikat buruh sebagai suatu perkara yang prinsipil.", b: "Saya merasa bahwa keluhan-keluhan tidak dapat dicegah dan saya mencoba sebaik mungkin untuk dapat dilenyapkan." },
  { n: 21, cell: "Z15", a: "Adalah penting bagi saya untuk memperoleh nilai kredit bagi ideide saya yang baik.", b: "Saya menyuarakan pendapat-pendapat saya di muka umum hanya bila saya merasa bahwa orang lain akan setuju dengan saya." },
  { n: 22, cell: "Z21", a: "Saya percaya bahwa Serikat-Serikat Buruh akan mencoba meruntuhkan kewibawaan pimpinan perusahaan.", b: "Saya percaya bahwa pertemuan-pertemuan yang sering dengan karyawan secara pribadi adalah membantu pengembangan diri mereka." },
  { n: 23, cell: "Z27", a: "Saya merasa bahwa tidak terlalu perlu untuk bawahan-bawahan saya mengerti mengapa mereka mengerjakan seuatu hal sejauh mereka mengerjakan hal tersebut.", b: "Saya merasa bahwa jam pencatat waktu datang dan pulangnya para pegawai, mengurangi keterlambatan." },
  { n: 24, cell: "Z33", a: "Saya biasanya membuat keputusan-keputusan saya sendiri dan menyampaikannya kepada bawahan saya.", b: "Saya merasa bahwa Serikat-Serikat Buruh dan pimpinan perusahaan adalah bekerja untuk mencapai tujuan-tujuan yang sama." },
  { n: 25, cell: "Z39", a: "Saya menyukai penggunaan dari skala penggajian karyawan.", b: "Saya selalu melakukan diskusi-diskusi untuk mencapai kata sepakat." },
  { n: 26, cell: "Z45", a: "Saya merasa bangga di dalam kenyataannya bahwa saya biasanya tidak akan menanyakan kepada seseorang untuk mengerjakan suatu tugas yang kalau untuk saya sendiri, tidak akan saya kerjakan.", b: "Saya berpikir bahwa bila beberapa bawahan saya merasa tidak berbahagia, saya akan mencoba melakukan sesuatu mengenai hal tersebut." },
  { n: 27, cell: "Z51", a: "Bila ada suatu tugas yang mendesak, walaupun semua peralatannya sudah disediakan saya akan membiarkannya saja, dan mengatakan kepada salah seorang bawahan saya untuk mengerjakan sesuatu tugas tersebut.", b: "Adalah penting bagi saya untuk memperoleh nilai kredit bagi ideide saya yang baik." },
  { n: 28, cell: "Z57", a: "Tujuan saya adalah mencapai bagaimana tugas-tugas dapat dikerjakan, tanpa saya merasa lebih benci daripada siapapun yang mengerjakan.", b: "Saya mungkin menentukan tugas-tugas tanpa banyak mempertimbangkan pengalaman atau kemampuan, tetapi saya lebih menuntut pada pencapaian hasil-hasilnya saja." },
  { n: 29, cell: "Z63", a: "Saya mungkin menentukan tugas-tugas tanpa banyak mempertimbangkan pengalaman atau kemampuan, tetapi saya lebih menuntut pada pencapaian hasil-hasilnya saja.", b: "Saya dengan sabar mendengarkan keluhan-keluhan dan ketidakpuasan-ketidakpuasan dari bawahan saya tetapi seringkali saya meralat apa yang mereka katakan." },
  { n: 30, cell: "Z69", a: "Saya merasa bahwa keluhan-keluhan tidak dapat dicegah dan saya mencoba sebaik mungkin untuk dapat dilenyapkan.", b: "Saya percaya bahwa bawahan-bawahan saya akan merasakan kepuasan kerja mereka tanpa merasakan tekanan apapun dari saya." },
  { n: 31, cell: "Z75", a: "Bila menghadapi masalah yang sulit, saya berusaha untuk mencapai pemecahan yang paling sedikit bisa diterima oleh sebagian besar orang-orang yang bersangkutan.", b: "Saya percaya bahwa latihan melalui pengalaman bekerja, adalah lebih bermanfaat daripada pendidikan teoritis" },
  { n: 32, cell: "Z81", a: "Saya selalu memberikan tugas-tugas yang sangat sulit kepada karyawan-karyawan yang paling berpengalaman. .", b: "Saya percaya bahwa kenaikan jabatan adalah semata-mata berdasarkan kemampuan yang ada" },
  { n: 33, cell: "Z87", a: "Saya merasa bahwa masalah-masalah yang timbul di antara para karyawan biasanya akan dapat diselesaikan di antara mereka sendiri, tanpa campur tangan dari saya.", b: "Bila saya ditegur oleh atasan saya, saya akan memanggil semua bawahan saya dan mengatakan semua teguran tersebut kepada mereka." },
  { n: 34, cell: "Z93", a: "Saya tidak peduli dengan apa yang dikerjakan oleh karyawan saya di luar jam kerja kantornya.", b: "Saya percaya bahwa bawahan-bawahan yang disiplin tidak akan memperbaiki jumlah atau mutu kerja mereka di dalam jangka waktu panjang." },
  { n: 35, cell: "Z99", a: "Saya memberikan informasi kepada “Dewan Direksi” tidak lebih dari pada apa yang mereka tanyakan.", b: "Kadang-kadang saya menentang keluhan-keluhan Serikat Buruh sebagai sesuatu perkara yang prinsipil." },
  { n: 36, cell: "Z105", a: "Saya kadang-kadang merasa ragu-ragu untuk membuat suatu keputusan yang akan tidak disukai oleh bawahan-bawahan saya.", b: "Tujuan saya adalah mencapai bagaimana tugas-tugas dapat dikerjakan, tanpa saya merasa lebih benci daripada siapapun yang mengerjakannya." },
  { n: 37, cell: "Z111", a: "Saya dengan sabar mendengarkan keluhan-keluhan dan ketidakpuasan–ketidakpuasan dari bawahan saya, tetapi seringkali saya meralat apa yang mereka katakan.", b: "Saya kadang-kadang merasa ragu-ragu untuk membuat keputusan-keputusan yang akan tidak disukai oleh bawahanbawahan saya." },
  { n: 38, cell: "Z117", a: "Saya menyuarakan pendapat-pendapat saya di muka umum hanya bila saya merasa bahwa orang lain akan setuju dengan saya.", b: "Sebagian besar dari bawahan-bawahan saya dapat menyelesaikan tugas-tugas mereka, bila perlu, tanpa kehadiran saya." },
  { n: 39, cell: "Z123", a: "Saya mengurusi pekerjaan saya sendiri, dan saya merasa bahwa pekerjaan saya itu bisa mencapai “Dewan Direksi” untuk mengembangkan ide-ide baru.", b: "Bila saya memberikan perintah kepada bawahan-bawahan saya, saya menentukan batas waktu untuk mereka menyelesaikannya." },
  { n: 40, cell: "Z129", a: "Saya selalu menganjurkan kepada bawahan saya untuk memberikan usul-usul, tetapi kadang-kadang juga saya langsung membuat suatu tindakan tertentu.", b: "Saya mencoba untuk membuat bawahan-bawahan saya merasa senang hatinya apabila mereka berbicara dengan saya" },
  { n: 41, cell: "AM15", a: "Di dalam diskusi, saya memberikan fakta-fakta seperti apa yang mereka pahami, dan membiarkan mereka melukiskan kesimpulankesimpulan mereka sendiri.", b: "Bila Direktur memberikan perintah yang kurang menyenangkan, saya pikir adalah cukup bijaksana bila saya menyebutkan namanya dan bukan nama saya." },
  { n: 42, cell: "AM21", a: "Bila ada tugas-tugas yang tidak dikehendaki yang harus dikerjakan, sebelumnya saya akan menanyakan kepada beberapa sukarelawan yang mau mengerjakan tugas tersebut.", b: "Saya menunjukkan minat saya terhadap kehidupan pribadi bawahan-bawahan saya, sebab saya merasa bahwa sayapun mengharapkan mereka berbuat seperti itu kepada saya." },
  { n: 43, cell: "AM27", a: "Saya adalah seorang yang sangat memperhatikan kebahagiaan karyawan-karyawan saya di dalam mereka mengerjakan tugastugas mereka.", b: "Saya selalu memperhatikan mengenai keterlambatan dan kemangkiran." },
  { n: 44, cell: "AM33", a: "Sebagian besar dari bawahan-bawahan saya dapat menyelesaikan tugas-tugas mereka, bila perlu tanpa kehadiran saya.", b: "Bila ada sesuatu tugas yang mendesak, walaupun semua peralatannya sesudah disediakan, saya akan membiarkannya saja dan mengatakan kepada salah seorang bawahan saya untuk mengerjakan tugas tersebut." },
  { n: 45, cell: "AM39", a: "Saya percaya bahwa bawahan-bawahan saya akan merasakan kepuasan kerja mereka tanpa merasakan tekanan apapun dari saya.", b: "Saya memberikan informasi kepada “Dewan Direksi” tidak lebih daripada apa yang mereka tanyakan." },
  { n: 46, cell: "AM45", a: "Saya percaya bahwa pertemuan-pertemuan yang sering dengan karyawan secara pribadi adalah membantu pengembangan diri mereka.", b: "Saya adalah seorang yang sangat memperhatikan karyawankaryawan saya di dalam mereka mengerjakan tugas-tugas mereka." },
  { n: 47, cell: "AM51", a: "Saya menunjukkan persetujuan untuk meningkatkan pengetahuan tentang pekerjaan dan perusahaan dari bawahanbawahan saya, walaupun hal itu sebenarnya belum diperlukan untuk kedudukan mereka sekarang.", b: "Saya mengawasi benar bawahan-bawahan saya yang kurang mahir di dalam bekerjanya atau bawahan-bawahan saya yang hasil kerjanya kurang memuaskan." },
  { n: 48, cell: "AM57", a: "Saya mengijinkan bawahan-bawahan saya untuk ikut serta mengambil keputusan dan saya selalu mematuhi keputusan yang dibuat berdasarkan atas suara terbanyak.", b: "Saya membuat bawahan-bawahan saya bekerja keras, dan saya berusaha menyakinkan mereka bahwa biasanya mereka mendapat perlakukan yang adil dari “Dewan Direksi”." },
  { n: 49, cell: "AM63", a: "Saya merasa bahwa semua karyawan pada jabatan yang sama seharusnya memperoleh gaji yang sama.", b: "Bila ada seorang karyawan yang hasil kerjanya selalu tidak memuaskan saya, saya akan menunggu suatu kesempatan untuk memindahkannya dan bukan untuk memecatnya." },
  { n: 50, cell: "AM69", a: "Saya merasa bahwa tujuan-tujuan Serikat Buruh dan tujuantujuan perusahaan adalah saling berbeda dan saya mencoba untuk tidak membuat pandangan saya secara jelas.", b: "Saya merasa bahwa adalah penting agar bawahan saya menyukai saya apabila saya bekerja keras untuk mereka." },
  { n: 51, cell: "AM75", a: "Saya mengawasi benar bawahan-bawahan saya yang kurang mahir di dalam bekerjanya atau bawahan-bawahan saya yang hasil kerjanya kurang memuaskan.", b: "Saya mencela pembicaraan-pembicaraan yang tidak perlu di antara bawahan-bawahan saya selama mereka bekerja." },
  { n: 52, cell: "AM81", a: "Bila saya memberikan perintah kepada bawahan-bawahan saya, saya menentukan batas waktu untuk mereka menyelesaikannya.", b: "Saya merasa bangga di dalam kenyataannya bahwa saya biasanya tidak akan menanyakan kepada seseorang untuk mengerjakan suatu tugas yang kalau saya sendiri tidak akan saya kerjakan." },
  { n: 53, cell: "AM87", a: "Saya percaya bahwa latihan melalui pengalaman bekerja, adalah lebih bermanfaat daripada pendidikan teoritis.", b: "Saya tidak peduli dengan apa yang dikerjakan oleh para pegawai saya di luar jam kantornya." },
  { n: 54, cell: "AM93", a: "Saya merasa bahwa jam pencatat waktu datang dan pulangnya para pegawai, mengurangi keterlambatan.", b: "Saya mengijinkan bawahan-bawahan saya untuk ikut serta mengambil keputusan dan saya selalu mematuhi keputusan yang dibuat berdasarkan atas suara terbanyak" },
  { n: 55, cell: "AM99", a: "Saya mengambil keputusan-keputusan saya sendiri, tetapi saya dapat mempertimbangkan saran-saran yang wajar dari bawahanbawahan saya untuk saya manfaatkan, bilamana saya bertanya kepada mereka.", b: "Saya merasa bahwa tujuan-tujuan Serikat Buruh dan tujuantujuan perusahaan adalah saling berbeda, dan saya mencoba untuk tidak membuat pandangan saya secara jelas." },
  { n: 56, cell: "AM105", a: "Saya membuat keputusan-keputusan sendiri dan kemudian saya mencoba untuk “menjual” keputusan-keputusan itu kepada bawahan saya.", b: "Apabila mungkin saya membentuk kelompok-kelompok kerja yang terdiri dari orang-orang yang sudah menjadi teman-teman baik saya." },
  { n: 57, cell: "AM111", a: "Saya tidak akan ragu-ragu untuk mempekerjakan pegawaipegawai yang cacat jasmaninya, bilamana saya merasa pasti bahwa dia dapat mempelajari pekerjannya.", b: "Saya mengabaikan pelanggar-pelanggar peraturan bila saya merasa pasti bahwa tidak ada satu orangpun yang mengetahui tentang pelanggaran-pelanggaran tersebut." },
  { n: 58, cell: "AM117", a: "Apabila mungkin saya membentuk kelompok-kelompok kerja yang terdiri dari orang-orang yang sudah menjadi teman-teman baik saya.", b: "Saya akan memberikan tugas-tugas yang sulit kepada bawahanbawahan saya yang berpengalaman, tetapi bila mereka memperoleh kesukaran, saya akan mengambil alih tanggung jawab mereka." },
  { n: 59, cell: "AM123", a: "Saya membuat bawahan-bawahan saya bekerja keras, dan saya berusaha meyakinkan mereka bahwa biasanya mereka mendapat perlakuan yang adil dari “Dewan Direksi”.", b: "Saya percaya bahwa suatu penerapan disiplin adalah merupakan seperangkat contoh untuk karyawan-karyawan lainnya." },
  { n: 60, cell: "AM129", a: "Saya mencoba untuk membuat bawahan-bawahan saya merasa senang hatinya apabila mereka berbicara dengan saya.", b: "Saya menyukai penggunaan dari skala penggajian karyawan." },
  { n: 61, cell: "AZ15", a: "Saya percaya bahwa kenaikan jabatan adalah semata-mata berdasarkan kemampuan yang ada.", b: "Saya merasa bahwa masalah-masalah yang timbul di antara mereka sendiri, tanpa campur tangan dari saya." },
  { n: 62, cell: "AZ21", a: "Saya merasa bahwa Serikat-Serikat Buruh dan pimpinan perusahaan adalah bekerja untuk mencapai tujuan-tujuan yang sama.", b: "Di dalam diskusi, saya memberikan fakta-fakta seperti apa yang mereka pahami, dan membiarkan mereka melukiskan kesimpulan-kesimpulan mereka sendiri" },
  { n: 63, cell: "AZ27", a: "Bila seorang karyawan tidak sanggup menyelesaikan tugasnya, saya akan membantu dia untuk menyelesaikan tugas tersebut.", b: "Saya merasa bahwa semua karyawan pada jabatan yang sama seharusnya memperoleh gaji yang sama." },
  { n: 64, cell: "AZ33", a: "Saya mengijinkan bawahan-bawahan saya untuk ikut serta di dalam pengambilan keputusan, tetapi sayapun menyediakan sesuatu yang jitu untuk membuat keputusan terakhir.", b: "Saya tidak akan ragu-ragu untuk mempekerjakan pegawaipegawai yang cacat jasmaninya, bilamana saya merasa bahwa dia dapat mempelajari pekerjaannya." },];

export const MSDT_TOTAL = MSDT_ITEMS.length; // 64

/** Kolom skoring 1..8 beserta kode gaya. */
export const MSDT_STYLE_COLUMNS = ["Ds", "Mi", "Au", "Co", "Bu", "Dv", "Ba", "E"] as const;
export type MsdtStyle = (typeof MSDT_STYLE_COLUMNS)[number];

export const MSDT_KOREKSI = [1, 2, 1, 0, 3, -1, 0, -4];

export const MSDT_STYLE_LABEL: Record<MsdtStyle, string> = {
  Ds: "Deserter — kurang berorientasi tugas maupun hubungan",
  Mi: "Missionary — mengutamakan keharmonisan hubungan",
  Au: "Autocrat — menekankan tugas dan kendali penuh",
  Co: "Compromiser — mudah berkompromi antara tugas & hubungan",
  Bu: "Bureaucrat — patuh pada aturan dan prosedur",
  Dv: "Developer — mengembangkan orang dan kepercayaan",
  Ba: "Benevolent Autocrat — tegas pada tugas namun disukai",
  E: "Executive — efektif menyeimbangkan tugas & hubungan",
};

export const MSDT_DIMENSION_LABEL: Record<string, string> = {
  TO: "TO — Task Orientation (orientasi tugas)",
  RO: "RO — Relationship Orientation (orientasi hubungan)",
  E: "E — Effectiveness (efektivitas)",
  O: "O — Deserter (ketidakterlibatan)",
};

/** Konversi skor dimensi ke skala 0–4 (persis rumus template). */
export function msdtKonversi(v: number): number {
  if (v < 30) return 0;
  if (v < 32) return 0.6;
  if (v === 32) return 1.2;
  if (v === 33) return 1.8;
  if (v === 34) return 2.4;
  if (v === 35) return 3;
  if (v < 38) return 3.6;
  return 4;
}

export type MsdtScores = {
  answered: number;
  total: number;
  columns: Record<MsdtStyle, { A: number; B: number; koreksi: number; jumlah: number }>;
  dims: { TO: number; RO: number; E: number; O: number };
  konversi: { TO: number; RO: number; E: number; O: number };
  dominant: MsdtStyle;
  dominantLabel: string;
};

/** Hitung skor MSDT dari jawaban kandidat (nomor item 1..64 -> "A" | "B"). */
export function msdtScore(picks: Record<number, string>): MsdtScores {
  const grid: (string | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  let answered = 0;
  for (let n = 1; n <= MSDT_TOTAL; n++) {
    const pick = (picks[n] ?? "").trim().toUpperCase();
    if (pick !== "A" && pick !== "B") continue;
    answered++;
    grid[Math.floor((n - 1) / 8)][(n - 1) % 8] = pick;
  }

  const columns = {} as MsdtScores["columns"];
  MSDT_STYLE_COLUMNS.forEach((style, j) => {
    let A = 0;
    let B = 0;
    for (let k = 0; k < 8; k++) {
      if (grid[j][k] === "A") A++; // baris ke-j
      if (grid[k][j] === "B") B++; // kolom ke-j
    }
    const koreksi = MSDT_KOREKSI[j];
    columns[style] = { A, B, koreksi, jumlah: A + B + koreksi };
  });

  const j = (s: MsdtStyle) => columns[s].jumlah;
  const dims = {
    TO: j("Au") + j("Co") + j("Ba") + j("E"),
    RO: j("Mi") + j("Co") + j("Dv") + j("E"),
    E: j("Bu") + j("Dv") + j("Ba") + j("E"),
    O: j("Ds"),
  };
  const konversi = {
    TO: msdtKonversi(dims.TO),
    RO: msdtKonversi(dims.RO),
    E: msdtKonversi(dims.E),
    O: msdtKonversi(dims.O),
  };

  const hiTO = konversi.TO > 2;
  const hiRO = konversi.RO > 2;
  const hiE = konversi.E > 2;
  const dominant: MsdtStyle = hiTO
    ? hiRO
      ? hiE
        ? "E"
        : "Co"
      : hiE
        ? "Ba"
        : "Au"
    : hiRO
      ? hiE
        ? "Dv"
        : "Mi"
      : hiE
        ? "Bu"
        : "Ds";

  return {
    answered,
    total: MSDT_TOTAL,
    columns,
    dims,
    konversi,
    dominant,
    dominantLabel: MSDT_STYLE_LABEL[dominant],
  };
}
