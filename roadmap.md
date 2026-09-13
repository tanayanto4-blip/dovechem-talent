# Roadmap — Port DOVECHEM TALENT ke CodeIgniter 3 (PHP 7.3 + MySQL)

Target: ZIP siap ekstrak ke folder `dc_talent` (XAMPP htdocs).

## Tahap
- [ ] 1. Ekstraksi logika dari aplikasi TanStack (scoring, kunci jawaban, aturan role)
- [ ] 2. Skema MySQL + dump data (tests, questions, codes, candidates, attempts, answers, users)
- [ ] 3. Kerangka CI3 + HMVC + config (security, CSRF helper, session, database)
- [ ] 4. Aset lokal: Bootstrap 5, Bootstrap Icons, jQuery (tanpa CDN)
- [ ] 5. Modul auth (admin/HR) + modul candidate login via kode akses
- [ ] 6. Modul admin: dashboard, kode, kandidat, bank soal, bank data/dokumen, hasil, akses test, monitoring, audit, users, pendampingan
- [ ] 7. Modul kandidat: portal, data diri + upload, daftar test, runner semua tipe test
- [ ] 8. Scoring + ekspor Excel (PhpSpreadsheet) & PDF
- [ ] 9. Landing page (home) + layout Bootstrap 5
- [ ] 10. Catatan deploy HTTPS + README instalasi, lalu ZIP
