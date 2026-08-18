import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  ClipboardList,
  Users,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Headphones,
  Timer,
  LineChart,
  Lock,
} from "lucide-react";
import doverLogo from "@/assets/dover-logo.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Portal Psikotest & Rekrutmen PT Dover Chemical" },
      {
        name: "description",
        content:
          "Portal resmi psikotest & rekrutmen PT Dover Chemical Indonesia. Kandidat login dengan kode akses, mengisi biodata, lalu mengerjakan psikotest online.",
      },
      { property: "og:title", content: "Portal Psikotest & Rekrutmen PT Dover Chemical" },
      {
        property: "og:description",
        content:
          "Portal resmi psikotest & rekrutmen PT Dover Chemical Indonesia. Kandidat login dengan kode akses, mengisi biodata, lalu mengerjakan psikotest online.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
    i: KeyRound,
    t: "Login Kode Akses",
    short: "Kode unik & ada masa berlaku",
    d: "Masukkan kode akses yang dibuat tim HR. Kode hanya aktif sampai batas tanggal/jam yang ditentukan.",
  },
  {
    n: "02",
    i: ClipboardList,
    t: "Lengkapi Biodata",
    short: "Nama, pendidikan, pengalaman, kontak",
    d: "Isi nama lengkap, sekolah/universitas, pendidikan, jurusan, lama pengalaman kerja, telp/HP, email, dan posisi yang dilamar.",
  },
  {
    n: "03",
    i: Headphones,
    t: "Dengarkan Instruksi",
    short: "Panduan suara sebelum tiap test",
    d: "Setiap test dibuka dengan instruksi suara dari tim HR. Anda bisa memutar ulang instruksi sebelum menekan Mulai Test.",
  },
  {
    n: "04",
    i: Timer,
    t: "Kerjakan Psikotest",
    short: "Sesuai jadwal dari tim HR",
    d: "Kerjakan test sesuai waktu yang tersedia. Jawaban tersimpan otomatis sehingga bisa dilanjutkan pada sesi yang sama.",
  },
  {
    n: "05",
    i: LineChart,
    t: "Evaluasi Tim HR",
    short: "Hasil hanya dilihat HR & Admin",
    d: "Skor dan interpretasi hasil direkap otomatis untuk tim HR. Kandidat akan dihubungi untuk tahap seleksi berikutnya.",
  },
];

const MARQUEE = [
  "Industri Kimia",
  "Resin & Hardener",
  "Sejak 1984",
  "ISO Certified",
  "Berorientasi Mutu",
  "R&D Berkelanjutan",
];

function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-ink/90 text-primary-foreground backdrop-blur-md">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 md:flex md:justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img
              src={doverLogo.url}
              alt="Logo PT Dover Chemical"
              className="h-8 w-auto shrink-0 rounded bg-white/95 p-0.5 object-contain sm:h-9"
            />
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-sm font-bold tracking-tight sm:text-base">
                PT DOVER CHEMICAL
              </div>
              <div className="truncate text-[10px] uppercase tracking-[0.24em] text-brand-gold">
                Recruitment Portal
              </div>
            </div>
          </Link>
          <nav className="hidden items-center gap-9 md:flex">
            {[
              { h: "#tentang", l: "Tentang" },
              { h: "#proses", l: "Proses Seleksi" },
              { h: "#kontak", l: "Kontak" },
            ].map((n) => (
              <a
                key={n.h}
                href={n.h}
                className="text-sm text-white/70 transition-colors hover:text-brand-gold"
              >
                {n.l}
              </a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden text-white/80 hover:bg-white/10 hover:text-primary-foreground sm:inline-flex"
            >
              <Link to="/auth">Login Admin</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-brand-gold text-brand-gold-foreground hover:bg-brand-gold-strong"
            >
              <Link to="/candidate/login">Login Kandidat</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-deep text-primary-foreground">
        <div className="absolute inset-0 bg-blueprint opacity-60" aria-hidden />
        <div className="absolute inset-x-0 top-0 h-px rule-gold" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-32">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-gold/40 bg-brand-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" /> Portal Rekrutmen Resmi
            </div>
            <h1 className="mt-6 font-display text-[2.1rem] font-bold leading-[1.05] sm:text-5xl lg:text-[4rem]">
              Seleksi kandidat
              <br />
              yang <span className="text-brand-gold">terukur</span> &amp; terpercaya
            </h1>
            <div className="mt-6 h-px w-24 rule-gold" aria-hidden />
            <p className="mt-6 max-w-xl text-base text-white/75 sm:text-lg">
              Platform psikotest &amp; administrasi rekrutmen PT Dover Chemical. Kandidat masuk
              dengan kode akses dari tim HR, melengkapi biodata, lalu mengerjakan rangkaian
              psikotest resmi secara online.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                asChild
                size="lg"
                className="w-full bg-brand-gold text-brand-gold-foreground shadow-gold hover:bg-brand-gold-strong sm:w-auto"
              >
                <Link to="/candidate/login">
                  Mulai Test <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full border-white/30 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground sm:w-auto"
              >
                <Link to="/auth">Panel Admin HR</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
              {[
                { n: "40+", l: "Tahun beroperasi" },
                { n: "1500+", l: "Karyawan" },
                { n: "9", l: "Modul psikotest" },
              ].map((s) => (
                <div key={s.l}>
                  <dt className="font-display text-2xl font-bold text-brand-gold sm:text-3xl">
                    {s.n}
                  </dt>
                  <dd className="mt-1 text-xs text-white/60 sm:text-sm">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Kartu akses kandidat */}
          <div className="relative">
            <div
              className="absolute -inset-3 rounded-[1.75rem] bg-brand-gold/10 blur-2xl"
              aria-hidden
            />
            <div className="relative rounded-2xl border border-white/12 bg-white/[0.06] p-6 backdrop-blur-xl shadow-elegant sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-gold">
                  Akses Kandidat
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70">
                  <Lock className="h-3 w-3" /> 1 kode · 1 perangkat
                </span>
              </div>
              <p className="mt-4 text-sm text-white/70">
                Sudah menerima kode akses dari tim rekrutmen? Masuk untuk melanjutkan proses
                seleksi Anda.
              </p>
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-white/25 bg-brand-ink/40 px-4 py-4 font-mono text-lg tracking-[0.35em] text-white/45">
                DOV-------
              </div>
              <Button
                asChild
                size="lg"
                className="mt-4 w-full bg-brand-gold text-brand-gold-foreground hover:bg-brand-gold-strong"
              >
                <Link to="/candidate/login">
                  Masukkan Kode Akses <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
                {STEPS.slice(0, 3).map((s) => (
                  <li key={s.n} className="flex items-center gap-3 text-sm text-white/75">
                    <s.i className="h-4 w-4 shrink-0 text-brand-gold" />
                    <span className="min-w-0 truncate">{s.t}</span>
                    <span className="ml-auto shrink-0 font-mono text-xs text-white/35">{s.n}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Strip kredensial */}
        <div className="relative border-t border-white/10 bg-brand-ink/60">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-4 sm:px-6">
            {MARQUEE.map((m) => (
              <span
                key={m}
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Tentang — bento */}
      <section id="tentang" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-gold-strong">
            Tentang
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold text-primary sm:text-4xl">
            Industri kimia yang mengutamakan orang
          </h2>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">
            PT Dover Chemical adalah produsen bahan kimia industri di Indonesia. Kami merekrut
            individu berkualitas untuk mendukung operasional pabrik, R&amp;D, dan tim manajemen.
            Portal ini memastikan proses seleksi berjalan transparan, terstruktur, dan aman.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl bg-deep p-7 text-primary-foreground shadow-elegant sm:p-8">
            <div className="absolute inset-0 bg-blueprint opacity-50" aria-hidden />
            <div className="relative">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-gold">
                Dalam angka
              </div>
              <div className="mt-6 grid grid-cols-2 gap-6">
                {[
                  { n: "40+", l: "Tahun beroperasi" },
                  { n: "1500+", l: "Karyawan" },
                  { n: "20+", l: "Product line" },
                  { n: "ISO", l: "Certified" },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="font-display text-3xl font-bold">{s.n}</div>
                    <div className="mt-1 text-xs text-white/60">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            {[
              {
                i: ClipboardList,
                t: "Produsen Bahan Kimia",
                d: "Memproduksi resin, hardener, dan bahan kimia industri untuk pasar domestik maupun ekspor.",
              },
              {
                i: ShieldCheck,
                t: "Standar Mutu & K3",
                d: "Operasional pabrik mengacu pada standar mutu, keselamatan kerja, dan kelestarian lingkungan.",
              },
              {
                i: Users,
                t: "Pengembangan SDM",
                d: "Karyawan didukung program pelatihan, jenjang karier, dan budaya kerja yang kolaboratif.",
              },
              {
                i: CheckCircle2,
                t: "Inovasi Berkelanjutan",
                d: "Tim R&D terus mengembangkan formulasi baru sesuai kebutuhan pelanggan industri.",
              },
            ].map((f) => (
              <div
                key={f.t}
                className="group rounded-2xl border bg-card p-6 shadow-card transition-shadow hover:shadow-elegant"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary">
                  <f.i className="h-5 w-5" />
                </div>
                <div className="mt-4 font-display font-semibold text-primary">{f.t}</div>
                <div className="mt-1.5 text-sm text-muted-foreground">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proses — timeline */}
      <section id="proses" className="bg-subtle py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-gold-strong">
              Alur Kandidat
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold text-primary sm:text-4xl">
              5 langkah dari kode akses hingga hasil
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Alur terbaru portal rekrutmen PT Dover Chemical — tanpa unggah berkas, cukup biodata
              dan pengerjaan test online.
            </p>
          </div>

          <ol className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div
              className="absolute left-0 right-0 top-[3.25rem] hidden h-px bg-border lg:block"
              aria-hidden
            />
            {STEPS.map((s) => (
              <li
                key={s.n}
                className="relative rounded-2xl border bg-card p-6 shadow-card transition-transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-deep text-primary-foreground">
                    <s.i className="h-5 w-5" />
                  </div>
                  <span className="font-display text-2xl font-bold text-brand-gold">{s.n}</span>
                </div>
                <div className="mt-4 font-display font-semibold text-primary">{s.t}</div>
                <div className="mt-1.5 text-sm text-muted-foreground">{s.d}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section id="kontak" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="relative overflow-hidden rounded-3xl bg-deep p-8 text-primary-foreground shadow-elegant sm:p-14">
          <div className="absolute inset-0 bg-blueprint opacity-60" aria-hidden />
          <div className="absolute inset-x-0 top-0 h-px rule-gold" aria-hidden />
          <div className="relative grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <h2 className="font-display text-2xl font-bold sm:text-4xl">
                Siap memulai proses seleksi?
              </h2>
              <p className="mt-4 max-w-xl text-sm text-white/70 sm:text-base">
                Masuk dengan kode akses yang Anda terima dari tim rekrutmen PT Dover Chemical. Tim
                HR akan mengevaluasi hasil dan menghubungi Anda untuk tahap berikutnya.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                asChild
                size="lg"
                className="w-full bg-brand-gold text-brand-gold-foreground hover:bg-brand-gold-strong"
              >
                <Link to="/candidate/login">Login Kandidat</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full border-white/30 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
              >
                <Link to="/auth">Login Admin HR</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-brand-ink py-10 text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-3">
          <div className="flex items-center gap-2.5">
            <img
              src={doverLogo.url}
              alt="Logo PT Dover Chemical"
              className="h-8 w-auto rounded bg-white/95 p-0.5 object-contain"
            />
            <div className="leading-tight">
              <div className="font-display text-sm font-bold">PT DOVER CHEMICAL</div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-brand-gold">
                Recruitment Portal
              </div>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/60 md:justify-center">
            <a href="#tentang" className="hover:text-brand-gold">
              Tentang
            </a>
            <a href="#proses" className="hover:text-brand-gold">
              Proses Seleksi
            </a>
            <Link to="/candidate/login" className="hover:text-brand-gold">
              Login Kandidat
            </Link>
            <Link to="/auth" className="hover:text-brand-gold">
              Login Admin
            </Link>
          </nav>
          <div className="text-xs text-white/50 md:text-right">
            © {new Date().getFullYear()} PT Dover Chemical Indonesia.
            <br className="hidden md:block" /> All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
