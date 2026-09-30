# Leadership Part II

## Tujuan
Menambahkan tes uraian **Leadership Part II** dari file Excel yang diberikan, khusus kandidat karyawan tingkat SPV ke atas.

## Yang dibuat
- Enam pertanyaan sesuai urutan file: Work Attitude/Fighting Spirit, Problem Solving, dan Leadership Readiness.
- Jawaban kandidat tersimpan otomatis dan dapat dilanjutkan sebelum waktu berakhir.
- Hasil dapat diunduh menggunakan file Excel asli: nama, tanggal tes, dan enam jawaban diisi pada sel yang tersedia.
- Kolom skor 1–5 tetap kosong agar diisi HR/user; gambar, format, ukuran baris, warna, dan isi lain tidak diubah.
- Tes dibuat tidak aktif terlebih dahulu agar Super Admin/HR dapat memeriksa sebelum dipublikasikan.

## Teknis
- Menggunakan jenis tes uraian leadership dan pembatasan audiens `karyawan_spv` yang sudah tersedia.
- File diubah pada level XML hanya pada sel identitas dan jawaban, bukan dibuat ulang, untuk mempertahankan layout asli.
- Menambahkan pemeriksaan integritas agar ekspor dibatalkan jika struktur template berubah.
- Menguji keenam jawaban masuk ke sel C7, C9, C12, C14, C17, dan C19 tanpa menyentuh D6:D19 sebagai kolom skor.
