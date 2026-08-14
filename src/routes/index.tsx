import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Beaker, ShieldCheck, ClipboardList, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import doverLogo from "@/assets/dover-logo.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Portal Psikotest & Rekrutmen PT Dover Chemical" },
      { name: "description", content: "Portal resmi psikotest & rekrutmen PT Dover Chemical Indonesia. Kandidat login dengan kode akses, mengisi biodata, lalu mengerjakan psikotest online." },
      { property: "og:title", content: "Portal Psikotest & Rekrutmen PT Dover Chemical" },
      { property: "og:description", content: "Portal resmi psikotest & rekrutmen PT Dover Chemical Indonesia. Kandidat login dengan kode akses, mengisi biodata, lalu mengerjakan psikotest online." },
      { property: "og:url", content: "https://test-dovechem.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://test-dovechem.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "PT Dover Chemical Indonesia",
              url: "https://test-dovechem.lovable.app/",
              logo: "https://test-dovechem.lovable.app/favicon.ico",
              description: "Perusahaan industri kimia dengan portal psikotest & rekrutmen online untuk calon karyawan.",
            },
            {
              "@type": "WebSite",
              name: "Portal Psikotest & Rekrutmen PT Dover Chemical",
              url: "https://test-dovechem.lovable.app/",
            },
          ],
        }),
      },
    ],
  }),

  component: Home,
});

const STEPS = [
  {
    n: "01",
    t: "Login Kode Akses",
    short: "Kode unik & ada masa berlaku",
    d: "Masukkan kode akses yang dibuat tim HR. Kode hanya aktif sampai batas tanggal/jam yang ditentukan.",
  },
  {
    n: "02",
    t: "Lengkapi Biodata",
    short: "Nama, pendidikan, pengalaman, kontak",
    d: "Isi nama lengkap, sekolah/universitas, pendidikan, jurusan, lama pengalaman kerja, telp/HP, email, dan posisi yang dilamar.",
  },
  {
    n: "03",
    t: "Dengarkan Instruksi",
    short: "Panduan suara sebelum tiap test",
    d: "Setiap test dibuka dengan instruksi suara dari tim HR. Anda bisa memutar ulang instruksi sebelum menekan Mulai Test.",
  },
  {
    n: "04",
    t: "Kerjakan Psikotest",
    short: "Sesuai jadwal dari tim HR",
    d: "Kerjakan test sesuai waktu yang tersedia. Jawaban tersimpan otomatis sehingga bisa dilanjutkan pada sesi yang sama.",
  },
  {
    n: "05",
    t: "Evaluasi Tim HR",
    short: "Hasil hanya dilihat HR & Admin",
    d: "Skor dan interpretasi hasil direkap otomatis untuk tim HR. Kandidat akan dihubungi untuk tahap seleksi berikutnya.",
  },
];

function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card shadow-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 md:flex md:justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src={doverLogo.url} alt="Logo PT Dover Chemical" className="h-8 w-auto shrink-0 object-contain sm:h-9" />
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-sm font-bold text-primary sm:text-base">PT DOVER CHEMICAL</div>
              <div className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">Recruitment Portal</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#tentang" className="text-sm text-muted-foreground hover:text-primary">Tentang</a>
            <a href="#proses" className="text-sm text-muted-foreground hover:text-primary">Proses Seleksi</a>
            <a href="#kontak" className="text-sm text-muted-foreground hover:text-primary">Kontak</a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/auth">Login Admin</Link></Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90"><Link to="/candidate/login">Login Kandidat</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 60%, white 0, transparent 40%)" }} />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-2 md:items-center md:gap-12 md:py-32">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-glow" /> Portal Rekrutmen Resmi
            </div>
            <h1 className="mt-5 font-display text-3xl font-bold leading-tight sm:text-4xl md:text-6xl">
              Portal Psikotest &amp; Rekrutmen<br />
              <span className="text-primary-glow">PT Dover Chemical</span>
            </h1>
            <p className="mt-4 max-w-lg text-base text-white/80 sm:mt-6 sm:text-lg">
              Platform psikotest &amp; administrasi rekrutmen untuk calon karyawan.
              Kandidat login dengan kode akses dari tim HR, mengisi biodata, lalu mengerjakan
              rangkaian psikotest resmi secara online.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="w-full bg-primary-glow text-primary-foreground hover:bg-primary-glow/90 sm:w-auto">
                <Link to="/candidate/login">Mulai Test <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full border-white/40 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground sm:w-auto">
                <Link to="/auth">Panel Admin HR</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 sm:mt-8">
              {["Industri Kimia", "Resin & Hardener", "Sejak 1984", "Berorientasi Mutu"].map((t) => (
                <span key={t} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="hidden md:block">
            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur shadow-elegant">
              <div className="space-y-3">
                {STEPS.map((s) => (
                  <div key={s.n} className="flex items-start gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="font-display text-2xl font-bold text-primary-glow">{s.n}</div>
                    <div>
                      <div className="font-semibold">{s.t}</div>
                      <div className="text-sm text-white/70">{s.short}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tentang */}
      <section id="tentang" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-24">
        <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-12">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-widest text-secondary">Tentang</div>
            <h2 className="mt-3 font-display text-2xl font-bold text-primary sm:text-4xl">Industri kimia yang mengutamakan orang</h2>
            <p className="mt-4 text-sm text-muted-foreground sm:text-base">
              PT Dover Chemical adalah produsen bahan kimia industri di Indonesia. Kami merekrut individu berkualitas
              untuk mendukung operasional pabrik, R&D, dan tim manajemen. Portal ini memastikan proses seleksi berjalan
              transparan, terstruktur, dan aman.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-6">
              {[
                { n: "40+", l: "Tahun beroperasi" },
                { n: "1500+", l: "Karyawan" },
                { n: "20+", l: "Product line" },
                { n: "ISO", l: "Certified" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-2xl font-bold text-primary sm:text-3xl">{s.n}</div>
                  <div className="text-sm text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { i: ClipboardList, t: "Produsen Bahan Kimia", d: "Memproduksi resin, hardener, dan bahan kimia industri untuk pasar domestik maupun ekspor." },
              { i: ShieldCheck, t: "Standar Mutu & K3", d: "Operasional pabrik mengacu pada standar mutu, keselamatan kerja, dan kelestarian lingkungan." },
              { i: Users, t: "Pengembangan SDM", d: "Karyawan didukung program pelatihan, jenjang karier, dan budaya kerja yang kolaboratif." },
              { i: CheckCircle2, t: "Inovasi Berkelanjutan", d: "Tim R&D terus mengembangkan formulasi baru sesuai kebutuhan pelanggan industri." },
            ].map((f) => (
              <div key={f.t} className="rounded-xl border bg-card p-5 shadow-card">
                <f.i className="h-6 w-6 text-primary-glow" />
                <div className="mt-3 font-semibold">{f.t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proses */}
      <section id="proses" className="bg-subtle py-14 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-secondary">Alur Kandidat</div>
            <h2 className="mt-3 font-display text-2xl font-bold text-primary sm:text-4xl">5 langkah dari kode akses hingga hasil</h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Alur terbaru portal rekrutmen PT Dover Chemical — tanpa unggah berkas, cukup biodata dan pengerjaan test online.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative rounded-xl border bg-card p-5 shadow-card sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-hero font-display text-lg font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <ArrowRight className="hidden h-4 w-4 text-muted-foreground/50 lg:block" />
                  )}
                </div>
                <div className="font-semibold text-primary">{s.t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="kontak" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-24">
        <div className="rounded-2xl bg-hero p-6 text-center text-primary-foreground shadow-elegant sm:p-12 md:p-16">
          <h2 className="font-display text-2xl font-bold sm:text-4xl md:text-5xl">Siap memulai proses seleksi?</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/80 sm:text-base">Masuk dengan kode akses yang Anda terima dari tim rekrutmen PT Dover Chemical.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="w-full bg-primary-glow hover:bg-primary-glow/90 sm:w-auto">
              <Link to="/candidate/login">Login Kandidat</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full border-white/40 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground sm:w-auto">
              <Link to="/auth">Login Admin HR</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t bg-primary py-8 text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center sm:px-6 md:flex-row md:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <img src={doverLogo.url} alt="Logo PT Dover Chemical" className="h-6 w-auto rounded bg-white/95 p-0.5 object-contain" />
            <span className="text-xs sm:text-sm">© {new Date().getFullYear()} PT Dover Chemical Indonesia. All rights reserved.</span>
          </div>
          <div className="text-xs text-white/60">Recruitment & Psychotest Portal</div>
        </div>
      </footer>
    </div>
  );
}
