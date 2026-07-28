/** Teks instruksi bawaan per jenis test — dipakai bila admin belum mengisi teks. */
const TYPE_TEMPLATES: Record<string, (name: string) => string> = {
  disc: (n) =>
    `Selamat datang di ${n}. Anda akan melihat kelompok pernyataan. Pada setiap kelompok, pilih satu pernyataan yang PALING menggambarkan diri Anda pada kolom Most, dan satu yang PALING TIDAK menggambarkan diri Anda pada kolom Least. Tidak ada jawaban benar atau salah. Tekan tombol Mulai Test bila Anda sudah siap.`,
  eq: (n) =>
    `Selamat datang di ${n}. Terdapat lima puluh pernyataan tentang cara Anda mengenali dan mengelola emosi. Jawablah sejujurnya sesuai kebiasaan Anda sehari-hari, bukan sesuai yang dianggap ideal. Jawaban tersimpan otomatis. Tekan tombol Mulai Test bila Anda sudah siap.`,
  mbti: (n) =>
    `Selamat datang di ${n}. Setiap nomor berisi dua pilihan, A dan B. Pilih satu yang paling mendekati diri Anda yang sebenarnya. Tidak ada jawaban benar atau salah, dan jangan terlalu lama berpikir pada satu nomor. Tekan tombol Mulai Test bila Anda sudah siap.`,
  wpt: (n) =>
    `Selamat datang di ${n}. Waktu pengerjaan sangat singkat, jadi kerjakan secepat mungkin. Soal tersusun makin lama makin sulit. Jika satu soal terasa sulit, lewati dan lanjutkan ke soal berikutnya. Tuliskan jawaban Anda pada kolom yang tersedia. Tekan tombol Mulai Test bila Anda sudah siap.`,
  kraepelin: (n) =>
    `Selamat datang di ${n}. Jumlahkan dua angka yang berdekatan secepat dan seteliti mungkin, lalu tuliskan angka satuannya saja. Kerjakan terus tanpa berhenti sampai ada aba-aba pindah kolom. Kecepatan dan ketelitian sama pentingnya. Tekan tombol Mulai Test bila Anda sudah siap.`,
  mcq: (n) =>
    `Selamat datang di ${n}. Setiap soal memiliki satu jawaban yang paling tepat. Kerjakan soal yang mudah lebih dahulu, lalu kembali ke soal yang sulit. Jawaban terkirim otomatis saat waktu habis. Tekan tombol Mulai Test bila Anda sudah siap.`,
};

export function voiceTemplateFor(name: string, type: string) {
  const fn =
    TYPE_TEMPLATES[(type || "").toLowerCase()] ??
    ((n: string) =>
      `Selamat datang di ${n}. Bacalah setiap soal dengan teliti. Kerjakan sesuai waktu yang tersedia. Jawaban tersimpan otomatis. Jika waktu habis, jawaban akan terkirim secara otomatis. Tekan tombol Mulai Test bila Anda sudah siap.`);
  return fn(name || "test ini");
}
