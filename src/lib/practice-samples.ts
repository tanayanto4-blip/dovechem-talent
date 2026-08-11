/**
 * Contoh soal + petunjuk untuk halaman latihan (terpisah dari halaman soal asli).
 * Kandidat membaca petunjuk dan mencoba 1 soal contoh di sini, sehingga halaman
 * test asli tampil bersih tanpa petunjuk apa pun.
 */

export type PracticeKind = "mcq" | "disc" | "papi" | "eq" | "text" | "pauli";

export type PracticeSample = {
  /** Jenis interaksi contoh soal. */
  kind: PracticeKind;
  /** Petunjuk pengisian (ditampilkan hanya di halaman latihan). */
  instructions: string[];
  /** Teks soal contoh. */
  question: string;
  /** Pilihan untuk kind "mcq" / "papi" / "disc". */
  options?: Array<{ key: string; text: string }>;
  /** Kunci contoh (opsional) untuk memberi umpan balik. */
  answerKey?: string;
  /** Penjelasan setelah kandidat menjawab contoh. */
  explanation: string;
};

const DEFAULT_SAMPLE: PracticeSample = {
  kind: "mcq",
  instructions: [
    "Baca setiap soal dengan teliti, lalu pilih satu jawaban yang menurut Anda paling tepat.",
    "Kerjakan secepat mungkin namun tetap teliti; jangan terlalu lama pada satu soal.",
    "Jawaban tersimpan otomatis. Waktu berjalan sejak Anda menekan tombol mulai di halaman test.",
  ],
  question: "Manakah angka berikutnya dari deret: 2, 4, 6, 8, ... ?",
  options: [
    { key: "A", text: "9" },
    { key: "B", text: "10" },
    { key: "C", text: "11" },
    { key: "D", text: "12" },
  ],
  answerKey: "B",
  explanation: "Deret bertambah 2 setiap langkah, sehingga angka berikutnya adalah 10.",
};

const SAMPLES: Record<string, PracticeSample> = {
  disc: {
    kind: "disc",
    instructions: [
      "Setiap kelompok berisi 4 pernyataan.",
      "Pilih M (Most) pada pernyataan yang paling menggambarkan diri Anda.",
      "Pilih L (Least) pada pernyataan yang paling tidak menggambarkan diri Anda.",
      "Hanya boleh 1 M dan 1 L per kelompok, dan tidak boleh pada pernyataan yang sama.",
      "Jawablah spontan — tidak ada jawaban benar atau salah.",
    ],
    question: "Contoh kelompok pernyataan:",
    options: [
      { key: "a", text: "Tegas dan berani mengambil keputusan" },
      { key: "b", text: "Ramah dan mudah bergaul" },
      { key: "c", text: "Sabar dan tenang" },
      { key: "d", text: "Teliti dan taat aturan" },
    ],
    explanation: "Anda sudah memilih 1 M dan 1 L. Seperti inilah cara mengisi seluruh kelompok pada halaman test.",
  },
  mbti: {
    kind: "mcq",
    instructions: [
      "Pilih salah satu pernyataan (A atau B) yang paling menggambarkan diri Anda.",
      "Tidak ada jawaban benar atau salah; jawablah spontan sesuai keseharian Anda.",
      "Jangan ada nomor yang terlewat.",
    ],
    question: "Contoh: Saat akhir pekan, Anda lebih memilih...",
    options: [
      { key: "A", text: "Berkumpul bersama banyak teman" },
      { key: "B", text: "Menikmati waktu tenang sendiri" },
    ],
    explanation: "Cukup pilih satu yang paling mendekati diri Anda. Begitu pula untuk seluruh nomor di halaman test.",
  },
  eq: {
    kind: "eq",
    instructions: [
      "Baca setiap pernyataan lalu nilai seberapa kuat pernyataan itu berlaku untuk Anda pada skala 1 sampai 5.",
      "1 = Tidak Terjadi, 2 = Jarang Terjadi, 3 = Kadang Terjadi, 4 = Kebiasaan, 5 = Selalu Terjadi.",
      "Tidak ada jawaban benar atau salah — jawablah jujur sesuai keseharian Anda.",
      "Jawablah seluruh pernyataan tanpa ada nomor yang terlewat.",
    ],
    question: "Contoh pernyataan: Saya dapat tetap tenang ketika menghadapi kritik.",
    explanation: "Pilih angka 1–5 sesuai kebiasaan Anda. Seperti itulah pengisian seluruh pernyataan pada halaman test.",
  },
  papi: {
    kind: "papi",
    instructions: [
      "Terdapat pasangan pernyataan pada setiap nomor.",
      "Pilih satu pernyataan saja: opsi A (atas) atau opsi B (bawah) yang paling mendekati gambaran diri Anda.",
      "Kadang kedua pernyataan terasa kurang sesuai, tetapi Anda tetap harus memilih salah satu.",
      "Bekerjalah cepat dan jangan sampai ada nomor yang terlewat.",
    ],
    question: "Contoh nomor 1:",
    options: [
      { key: "A", text: "Saya senang bekerja keras" },
      { key: "B", text: "Saya senang bekerja bersama orang lain" },
    ],
    explanation: "Satu pilihan saja per nomor (A atau B). Begitu seterusnya sampai nomor terakhir.",
  },
  wpt: {
    kind: "text",
    instructions: [
      "Tes ini mengukur kemampuan memecahkan masalah: verbal, numerik, logika, dan spasial.",
      "Soal semakin lama semakin sulit. Kerjakan tanpa alat bantu (kalkulator, kamus, dll.).",
      "Kolom jawaban dibiarkan kosong — tulis sendiri jawaban Anda (boleh angka, huruf, kata, YA/TIDAK, sesuai perintah soal).",
      "Jangan berlama-lama pada satu soal; lewati bila perlu lalu kembali jika masih ada waktu.",
    ],
    question: "Contoh: MENUAI adalah lawan kata dari  1. mendapat  2. bersorak  3. melanjutkan  4. berada  5. menabur",
    answerKey: "5",
    explanation: "Jawaban yang ditulis cukup angka pilihannya, yaitu 5 (menabur).",
  },
  pauli: {
    kind: "pauli",
    instructions: [
      "Anda akan menjumlahkan dua angka yang berdekatan dari atas ke bawah secara berurutan.",
      "Tulis hasil penjumlahan di kotak jawaban di samping pasangan angka tersebut.",
      "Jika hasilnya dua angka (puluhan), tulis angka terakhirnya saja.",
      "Kerjakan secepat dan seteliti mungkin, jangan melompati baris.",
    ],
    question: "Contoh: 7 dan 8 berdekatan → 7 + 8 = 15 → yang ditulis adalah 5.",
    answerKey: "5",
    explanation: "Betul: hanya angka terakhir (satuan) yang ditulis pada kotak jawaban.",
  },
  kraepelin: {
    kind: "pauli",
    instructions: [
      "Anda akan menjumlahkan dua angka yang berdekatan dari atas ke bawah secara berurutan.",
      "Tulis hasil penjumlahan di kotak jawaban di samping pasangan angka tersebut.",
      "Jika hasilnya dua angka (puluhan), tulis angka terakhirnya saja.",
      "Kerjakan secepat dan seteliti mungkin, jangan melompati baris.",
    ],
    question: "Contoh: 6 dan 9 berdekatan → 6 + 9 = 15 → yang ditulis adalah 5.",
    answerKey: "5",
    explanation: "Betul: hanya angka terakhir (satuan) yang ditulis pada kotak jawaban.",
  },
};

export function practiceSampleFor(testType?: string | null): PracticeSample {
  return (testType && SAMPLES[testType]) || DEFAULT_SAMPLE;
}
