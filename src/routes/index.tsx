import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Beaker, ShieldCheck, ClipboardList, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import doverLogo from "@/assets/dover-logo.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Psikotest & Rekrutment PT Dover Chemical | Portal Kandidat" },
      {
        name: "description",
        content:
          "Portal psikotest & rekrutment PT Dover Chemical Indonesia — industri kimia sejak 1960 dengan 600+ karyawan. Login kode akses, isi biodata, kerjakan test online.",
      },
      { property: "og:title", content: "Psikotest & Rekrutment PT Dover Chemical | Portal Kandidat" },
      {
        property: "og:description",
        content:
          "Portal psikotest & rekrutment PT Dover Chemical Indonesia — industri kimia sejak 1960 dengan 600+ karyawan. Login kode akses, isi biodata, kerjakan test online.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "PT Dover Chemical Indonesia" },
      { property: "og:url", content: "https://test-dovechem.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Psikotest & Rekrutment PT Dover Chemical" },
      {
        name: "twitter:description",
        content:
          "Industri kimia sejak 1960, 600+ karyawan. Login kode akses untuk mengerjakan psikotest online.",
      },
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
              description:
                "Perusahaan industri kimia dengan portal psikotest & rekrutmen online untuk calon karyawan.",
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

const HIGHLIGHTS = [
  {
    i: ClipboardList,
    t: "Produsen Bahan Kimia",
    d: "Resin, hardener, dan bahan kimia industri untuk pasar domestik maupun ekspor.",
  },
  {
    i: ShieldCheck,
    t: "Standar Mutu & K3",
    d: "Operasional pabrik mengacu standar mutu, keselamatan kerja, dan lingkungan.",
  },
  {
    i: Users,
    t: "Pengembangan SDM",
    d: "Program pelatihan, jenjang karier, dan budaya kerja yang kolaboratif.",
  },
  {
    i: CheckCircle2,
    t: "Inovasi Berkelanjutan",
    d: "Tim R&D mengembangkan formulasi baru sesuai kebutuhan pelanggan industri.",
  },
];

const STATS = [
  { n: "60+", l: "Tahun beroperasi" },
  { n: "600+", l: "Karyawan" },
  { n: "20+", l: "Product line" },
  { n: "ISO", l: "Certified" },
];



function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/85 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 md:flex md:justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img
              src={doverLogo.url}
              alt="Logo PT Dover Chemical"
              className="h-8 w-auto shrink-0 object-contain sm:h-9"
            />
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-sm font-bold tracking-tight text-primary sm:text-base">
                PT DOVER CHEMICAL
              </div>
              <div className="truncate text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Recruitment Portal
              </div>
            </div>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            <a href="#tentang" className="text-sm text-muted-foreground hover:text-primary">
              Tentang
            </a>
            <a href="#proses" className="text-sm text-muted-foreground hover:text-primary">
              Proses Seleksi
            </a>
            <a href="#kontak" className="text-sm text-muted-foreground hover:text-primary">
              Kontak
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/auth">Login Admin</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/candidate/login">Login Kandidat</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* BENTO HERO */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12">
        <div className="grid auto-rows-auto gap-3 sm:gap-4 lg:grid-cols-3">
          {/* Kartu utama */}
          <div className="relative overflow-hidden rounded-3xl bg-hero p-6 text-primary-foreground shadow-elegant sm:p-10 lg:col-span-2 lg:row-span-2">
            <div
              className="pointer-events-none absolute inset-0 opacity-25"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 15% 15%, white 0, transparent 45%), radial-gradient(circle at 85% 75%, white 0, transparent 45%)",
              }}
            />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-glow" /> Portal Rekrutmen Resmi
              </div>
              <h1 className="mt-6 font-display text-3xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Psikotest &amp; Rekrutment
              </h1>
              <p className="mt-5 max-w-md text-sm text-white/80 sm:text-base">
                Kandidat login dengan kode akses dari tim HR, melengkapi biodata, lalu mengerjakan
                rangkaian psikotest resmi PT Dover Chemical secara online.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-primary-glow text-primary-foreground hover:bg-primary-glow/90 sm:w-auto"
                >
                  <Link to="/candidate/login">
                    Mulai Test <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full border-white/40 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground sm:w-auto"
                >
                  <Link to="/auth">Panel Admin HR</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Kartu identitas */}
          <div className="rounded-3xl border bg-card p-6 shadow-card">
            <Beaker className="h-6 w-6 text-primary-glow" />
            <div className="mt-4 font-display text-lg font-bold text-primary">
              Industri kimia sejak 1960
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Resin, hardener, dan bahan kimia industri — dengan tim yang terus bertumbuh.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Resin & Hardener", "Berorientasi Mutu", "ISO Certified"].map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Kartu statistik */}
          <div className="grid grid-cols-2 gap-3 rounded-3xl border bg-card p-6 shadow-card sm:gap-4">
            {STATS.map((s) => (
              <div key={s.l}>
                <div className="font-display text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                  {s.n}
                </div>
                <div className="text-xs text-muted-foreground sm:text-sm">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tentang — bento */}
      <section id="tentang" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
            Tentang
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-primary sm:text-4xl">
            Industri kimia yang mengutamakan orang
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            PT Dover Chemical merekrut individu berkualitas untuk operasional pabrik, R&amp;D, dan
            tim manajemen. Portal ini menjaga proses seleksi tetap transparan, terstruktur, dan
            aman.
          </p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {HIGHLIGHTS.map((f) => (
            <div
              key={f.t}
              className="rounded-2xl border bg-card p-5 shadow-card transition-shadow hover:shadow-elegant"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent">
                <f.i className="h-5 w-5 text-primary-glow" />
              </div>
              <div className="mt-4 font-display font-semibold text-primary">{f.t}</div>
              <div className="mt-1.5 text-sm text-muted-foreground">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Proses — bento asimetris */}
      <section id="proses" className="bg-subtle py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Alur Kandidat
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-primary sm:text-4xl">
              5 langkah dari kode akses hingga hasil
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Tanpa unggah berkas — cukup biodata dan pengerjaan test online.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:gap-4 lg:grid-cols-6">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className={`rounded-2xl border bg-card p-5 shadow-card sm:p-6 ${
                  i === 0 ? "lg:col-span-3" : i === 1 ? "lg:col-span-3" : "lg:col-span-2"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-hero font-display text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  <div className="font-display font-semibold text-primary">{s.t}</div>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="kontak" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-3xl bg-hero p-6 text-primary-foreground shadow-elegant sm:p-10">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-4xl">
              Siap memulai proses seleksi?
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base">
              Masuk dengan kode akses yang Anda terima dari tim rekrutmen PT Dover Chemical.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 w-full bg-primary-glow hover:bg-primary-glow/90 sm:w-auto"
            >
              <Link to="/candidate/login">
                Login Kandidat <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-10">
            <div className="font-display text-lg font-semibold text-primary">Tim HR &amp; Admin</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Kelola kode akses, bank soal, dan hasil psikotest kandidat dari satu dashboard.
            </p>
            <Button asChild variant="outline" size="lg" className="mt-6 w-full sm:w-auto">
              <Link to="/auth">Login Admin HR</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-secondary py-6 text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src={doverLogo.url}
              alt="Logo PT Dover Chemical"
              className="h-8 w-auto rounded bg-white/95 p-1 object-contain"
            />
            <span className="text-sm">
              © {new Date().getFullYear()} PT Dover Chemical Indonesia. All rights reserved.
            </span>
          </div>
          <div className="text-sm text-white/80">Recruitment &amp; Psychotest Portal</div>
        </div>
      </footer>

    </div>
  );
}
