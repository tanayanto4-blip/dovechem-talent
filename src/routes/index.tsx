import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Beaker, ShieldCheck, ClipboardList, Users, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PT Dover Chemical — Portal Psikotest Rekrutmen" },
      { name: "description", content: "Portal resmi psikotest & rekrutmen PT Dover Chemical Indonesia. Kandidat login dengan kode akses, tim HR mengelola seluruh proses seleksi." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-hero text-primary-foreground">
              <Beaker className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-base font-bold text-primary">PT DOVER CHEMICAL</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Recruitment Portal</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#tentang" className="text-sm text-muted-foreground hover:text-primary">Tentang</a>
            <a href="#proses" className="text-sm text-muted-foreground hover:text-primary">Proses Seleksi</a>
            <a href="#kontak" className="text-sm text-muted-foreground hover:text-primary">Kontak</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Login Admin</Link></Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90"><Link to="/candidate/login">Login Kandidat</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 60%, white 0, transparent 40%)" }} />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-2 md:items-center md:py-32">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-glow" /> Portal Rekrutmen Resmi
            </div>
            <h1 className="mt-6 font-display text-5xl font-bold leading-tight md:text-6xl">
              Selamat datang di<br />
              <span className="text-primary-glow">PT Dover Chemical</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-white/80">
              Platform psikotest & administrasi rekrutmen untuk calon karyawan.
              Kandidat login dengan kode akses yang diberikan tim HR untuk mengerjakan test dan melengkapi berkas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary-glow text-primary-foreground hover:bg-primary-glow/90">
                <Link to="/candidate/login">Mulai Test <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                <Link to="/auth">Panel Admin HR</Link>
              </Button>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur shadow-elegant">
              <div className="space-y-4">
                {[
                  { n: "01", t: "Terima Kode Akses", d: "Kode unik dikirim tim HR" },
                  { n: "02", t: "Lengkapi Data Diri", d: "KTP, KK, CV, ijazah, transkrip" },
                  { n: "03", t: "Kerjakan Psikotest", d: "Logika, DISC, Kraepelin" },
                  { n: "04", t: "Menunggu Evaluasi", d: "Hasil dievaluasi tim HR" },
                ].map((s) => (
                  <div key={s.n} className="flex items-start gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="font-display text-2xl font-bold text-primary-glow">{s.n}</div>
                    <div>
                      <div className="font-semibold">{s.t}</div>
                      <div className="text-sm text-white/70">{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tentang */}
      <section id="tentang" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-secondary">Tentang</div>
            <h2 className="mt-3 font-display text-4xl font-bold text-primary">Industri kimia yang mengutamakan orang</h2>
            <p className="mt-4 text-muted-foreground">
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
                  <div className="font-display text-3xl font-bold text-primary">{s.n}</div>
                  <div className="text-sm text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { i: ShieldCheck, t: "Aman & Terenkripsi", d: "Data pribadi dan berkas Anda dilindungi dengan standar keamanan tinggi." },
              { i: ClipboardList, t: "Terstruktur", d: "Test dan pengisian data mengikuti alur yang jelas." },
              { i: Users, t: "Dipantau HR", d: "Setiap kandidat dievaluasi langsung oleh tim rekrutmen kami." },
              { i: CheckCircle2, t: "Real-time", d: "Progress test tersimpan otomatis." },
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
      <section id="proses" className="bg-subtle py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-secondary">Alur Kandidat</div>
            <h2 className="mt-3 font-display text-4xl font-bold text-primary">4 langkah dari kode akses hingga hasil</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              { n: 1, t: "Login dengan Kode", d: "Masukkan kode akses yang dikirim tim HR ke email Anda." },
              { n: 2, t: "Isi Data Diri", d: "Lengkapi biodata lalu upload KTP, KK, CV, ijazah dan transkrip." },
              { n: 3, t: "Kerjakan Psikotest", d: "Test logika, kepribadian DISC, dan ketelitian Kraepelin." },
              { n: 4, t: "Hasil Dievaluasi", d: "Tim HR akan menghubungi Anda untuk tahap selanjutnya." },
            ].map((s) => (
              <div key={s.n} className="relative rounded-xl border bg-card p-6 shadow-card">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-hero font-display text-lg font-bold text-primary-foreground">{s.n}</div>
                <div className="font-semibold text-primary">{s.t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="kontak" className="mx-auto max-w-7xl px-6 py-24">
        <div className="rounded-2xl bg-hero p-12 text-center text-primary-foreground shadow-elegant md:p-16">
          <h2 className="font-display text-4xl font-bold md:text-5xl">Siap memulai proses seleksi?</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">Masuk dengan kode akses yang Anda terima dari tim rekrutmen PT Dover Chemical.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-primary-glow hover:bg-primary-glow/90">
              <Link to="/candidate/login">Login Kandidat</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
              <Link to="/auth">Login Admin HR</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t bg-primary py-8 text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            <span className="text-sm">© {new Date().getFullYear()} PT Dover Chemical Indonesia. All rights reserved.</span>
          </div>
          <div className="text-xs text-white/60">Recruitment & Psychotest Portal</div>
        </div>
      </footer>
    </div>
  );
}
