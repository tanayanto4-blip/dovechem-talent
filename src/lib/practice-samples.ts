import { RMIB_GROUPS } from "@/lib/rmib-key";
/**
 * Contoh soal + petunjuk untuk halaman latihan (terpisah dari halaman soal asli).
 * Bentuk soal & lembar jawaban contoh dibuat SAMA PERSIS dengan halaman test asli,
 * sehingga kandidat cukup melihat contoh ini untuk memahami cara pengisian.
 */

export type PracticeTestType =
  | "mcq"
  | "disc"
  | "mbti"
  | "eq"
  | "wpt"
  | "papi"
  | "msdt"
  | "pauli"
  | "kraepelin"
  | "ishihara"
  | "rmib";

export type PracticeQuestion = {
  id: string;
  question_number: number;
  question_text?: string | null;
  options?: any;
};

export type PracticeSample = {
  /** Tipe test — dipakai untuk merender komponen yang sama dengan halaman asli. */
  testType: PracticeTestType;
  /** Petunjuk pengisian (ditampilkan hanya di halaman latihan). */
  instructions: string[];
  /** Soal contoh dengan struktur data identik dengan soal asli. */
  question: PracticeQuestion;
  /** Kunci contoh (opsional) untuk memberi umpan balik. */
  answerKey?: string;
  /** Penjelasan setelah kandidat menjawab contoh. */
  explanation: string;
};

const EQ_SCALE = [
  { key: "1", label: "1 — Tidak Terjadi" },
  { key: "2", label: "2 — Jarang Terjadi" },
  { key: "3", label: "3 — Kadang Terjadi" },
  { key: "4", label: "4 — Kebiasaan" },
  { key: "5", label: "5 — Selalu Terjadi" },
];

const DEFAULT_SAMPLE: PracticeSample = {
  testType: "mcq",
  instructions: [
    "Baca setiap soal dengan teliti, lalu pilih satu jawaban yang menurut Anda paling tepat.",
    "Kerjakan secepat mungkin namun tetap teliti; jangan terlalu lama pada satu soal.",
    "Jawaban tersimpan otomatis. Waktu berjalan sejak Anda menekan tombol mulai di halaman test.",
  ],
  question: {
    id: "sample-mcq",
    question_number: 1,
    question_text: "Manakah angka berikutnya dari deret: 2, 4, 6, 8, ... ?",
    options: [
      { key: "A", label: "9" },
      { key: "B", label: "10" },
      { key: "C", label: "11" },
      { key: "D", label: "12" },
    ],
  },
  answerKey: "B",
  explanation: "Deret bertambah 2 setiap langkah, sehingga angka berikutnya adalah 10.",
};

const SAMPLES: Record<string, PracticeSample> = {
  disc: {
    testType: "disc",
    instructions: [
      "Setiap kelompok berisi 4 pernyataan.",
      "Pilih M (Most) pada pernyataan yang paling menggambarkan diri Anda.",
      "Pilih L (Least) pada pernyataan yang paling tidak menggambarkan diri Anda.",
      "Hanya boleh 1 M dan 1 L per kelompok, dan tidak boleh pada pernyataan yang sama.",
      "Jawablah spontan — tidak ada jawaban benar atau salah.",
    ],
    question: {
      id: "sample-disc",
      question_number: 1,
      question_text: null,
      options: [
        { key: "a", label: "Tegas dan berani mengambil keputusan" },
        { key: "b", label: "Ramah dan mudah bergaul" },
        { key: "c", label: "Sabar dan tenang" },
        { key: "d", label: "Teliti dan taat aturan" },
      ],
    },
    explanation:
      "Anda sudah memilih 1 M dan 1 L. Seperti inilah cara mengisi seluruh kelompok pada halaman test.",
  },
  mbti: {
    testType: "mbti",
    instructions: [
      "Isi angka 1 pada kolom A atau B — pilih salah satu yang paling menggambarkan diri Anda.",
      "Tidak ada jawaban benar atau salah; jawablah spontan sesuai keseharian Anda.",
      "Jangan ada nomor yang terlewat.",
    ],
    question: {
      id: "sample-mbti",
      question_number: 1,
      question_text: "Saat akhir pekan, Anda lebih memilih...",
      options: [
        { key: "A", label: "Berkumpul bersama banyak teman" },
        { key: "B", label: "Menikmati waktu tenang sendiri" },
      ],
    },
    explanation:
      "Cukup isi angka 1 pada satu kolom saja (A atau B). Begitu pula untuk seluruh nomor di halaman test.",
  },
  eq: {
    testType: "eq",
    instructions: [
      "Baca setiap pernyataan lalu nilai seberapa kuat pernyataan itu berlaku untuk Anda pada skala 1 sampai 5.",
      "1 = Tidak Terjadi, 2 = Jarang Terjadi, 3 = Kadang Terjadi, 4 = Kebiasaan, 5 = Selalu Terjadi.",
      "Tidak ada jawaban benar atau salah — jawablah jujur sesuai keseharian Anda.",
      "Jawablah seluruh pernyataan tanpa ada nomor yang terlewat.",
    ],
    question: {
      id: "sample-eq",
      question_number: 1,
      question_text: "Saya dapat tetap tenang ketika menghadapi kritik.",
      options: EQ_SCALE,
    },
    explanation:
      "Pilih angka 1–5 sesuai kebiasaan Anda. Seperti itulah pengisian seluruh pernyataan pada halaman test.",
  },
  papi: {
    testType: "papi",
    instructions: [
      "Terdapat pasangan pernyataan pada setiap nomor.",
      "Pilih satu pernyataan saja: opsi A (atas) atau opsi B (bawah) yang paling mendekati gambaran diri Anda.",
      "Kadang kedua pernyataan terasa kurang sesuai, tetapi Anda tetap harus memilih salah satu.",
      "Bekerjalah cepat dan jangan sampai ada nomor yang terlewat.",
    ],
    question: {
      id: "sample-papi",
      question_number: 1,
      question_text: null,
      options: [
        { key: "A", label: "Saya senang bekerja keras" },
        { key: "B", label: "Saya senang bekerja bersama orang lain" },
      ],
    },
    explanation: "Satu pilihan saja per nomor (A atau B). Begitu seterusnya sampai nomor terakhir.",
  },
  msdt: {
    testType: "msdt",
    instructions: [
      "Setiap nomor berisi dua pernyataan tentang cara Anda memimpin atau bekerja.",
      "Pilih satu pernyataan saja: opsi A (atas) atau opsi B (bawah) yang paling menggambarkan diri Anda.",
      "Kadang keduanya terasa kurang sesuai, tetapi Anda tetap harus memilih salah satu.",
      "Jawablah seluruh 64 nomor tanpa ada yang terlewat.",
    ],
    question: {
      id: "sample-msdt",
      question_number: 1,
      question_text: null,
      options: [
        { key: "A", label: "Saya membuat keputusan sendiri lalu menyampaikannya kepada tim." },
        { key: "B", label: "Saya mengajak tim berdiskusi sebelum keputusan diambil." },
      ],
    },
    explanation: "Satu pilihan saja per nomor (A atau B). Begitu seterusnya sampai nomor terakhir.",
  },

  wpt: {
    testType: "wpt",
    instructions: [
      "Tes ini mengukur kemampuan memecahkan masalah: verbal, numerik, logika, dan spasial.",
      "Soal semakin lama semakin sulit. Kerjakan tanpa alat bantu (kalkulator, kamus, dll.).",
      "Klik nomor soal untuk membukanya, lalu tulis jawaban Anda pada kolom yang tersedia.",
      "Jangan berlama-lama pada satu soal; lewati bila perlu lalu kembali jika masih ada waktu.",
    ],
    question: {
      id: "sample-wpt",
      question_number: 1,
      question_text:
        "MENUAI adalah lawan kata dari  1. mendapat  2. bersorak  3. melanjutkan  4. berada  5. menabur",
    },
    answerKey: "5",
    explanation: "Jawaban yang ditulis cukup angka pilihannya, yaitu 5 (menabur).",
  },
  pauli: {
    testType: "pauli",
    instructions: [
      "Anda akan menjumlahkan dua angka yang berdekatan dari atas ke bawah secara berurutan.",
      "Tulis hasil penjumlahan di kotak jawaban di samping pasangan angka tersebut.",
      "Jika hasilnya dua angka (puluhan), tulis angka terakhirnya saja.",
      "Kerjakan secepat dan seteliti mungkin, jangan melompati baris.",
    ],
    question: {
      id: "sample-pauli",
      question_number: 1,
      options: { digits: "78349" },
    },
    answerKey: "5",
    explanation: "Betul: hanya angka terakhir (satuan) yang ditulis pada kotak jawaban.",
  },
  rmib: {
    testType: "rmib",
    instructions: [
      "Anda akan melihat kelompok-kelompok daftar pekerjaan; slide pertama adalah kelompok A, lalu berlanjut ke kelompok berikutnya.",
      "Setiap kelompok berisi 12 jenis pekerjaan dan berbentuk tabel.",
      "Tulis sendiri angkanya di dalam kotak: 1 untuk pekerjaan yang paling Anda sukai, sampai 12 untuk yang paling tidak Anda sukai.",
      "Setiap angka 1-12 hanya boleh dipakai satu kali dalam satu kelompok, dan tidak boleh ada kotak yang kosong.",
      "Daftar pekerjaan menyesuaikan jenis kelamin Anda secara otomatis. Kerjakan cepat sesuai kesan pertama.",
    ],
    question: {
      id: "sample-rmib",
      question_number: 1,
      options: { code: "A", jobs: RMIB_GROUPS[0]!.jobs },
    },
    explanation:
      "Seperti itu: isi seluruh 12 kotak dengan angka 1 sampai 12 tanpa ada angka yang kembar, lalu lanjut ke kelompok berikutnya.",
  },
  ishihara: {
    testType: "ishihara",
    instructions: [
      "Tes ini mengukur kemampuan penglihatan warna Anda.",
      "Lihat setiap lembar warna, lalu tuliskan sendiri angka yang Anda lihat pada kolom jawaban.",
      "Beberapa lembar memang tidak memuat angka. Jika Anda tidak melihat angka apa pun, cukup tulis tanda strip ( - ).",
      "Lihat gambar dari jarak normal (sekitar 60–75 cm) dan jangan terlalu lama pada satu lembar.",
    ],
    question: {
      id: "sample-ishihara",
      question_number: 1,
      question_text: "Tuliskan angka yang Anda lihat pada gambar berikut.",
    },
    answerKey: "12",
    explanation:
      "Jawaban cukup ditulis angkanya saja, misalnya 12. Bila tidak ada angka yang terlihat, tulis tanda strip ( - ).",
  },
  kraepelin: {
    testType: "pauli",
    instructions: [
      "Anda akan menjumlahkan dua angka yang berdekatan dari atas ke bawah secara berurutan.",
      "Tulis hasil penjumlahan di kotak jawaban di samping pasangan angka tersebut.",
      "Jika hasilnya dua angka (puluhan), tulis angka terakhirnya saja.",
      "Kerjakan secepat dan seteliti mungkin, jangan melompati baris.",
    ],
    question: {
      id: "sample-kraepelin",
      question_number: 1,
      options: { digits: "69258" },
    },
    answerKey: "5",
    explanation: "Betul: hanya angka terakhir (satuan) yang ditulis pada kotak jawaban.",
  },
};

export function practiceSampleFor(testType?: string | null): PracticeSample {
  return (testType && SAMPLES[testType]) || DEFAULT_SAMPLE;
}
