import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapStatus, createBootstrapAdmin } from "@/lib/users.functions";
import { toast } from "sonner";
import { Beaker, ArrowLeft, Lock } from "lucide-react";
import doverLogo from "@/assets/dover-logo.jpg.asset.json";

export const Route = createFileRoute("/auth")({
  // Login state lives in browser storage only; rendering this page on the
  // server produced a hydration mismatch that surfaced in the error monitor.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Login Admin HR — PT Dover Chemical" },
      {
        name: "description",
        content:
          "Halaman masuk administrator dan tim HR PT Dover Chemical untuk mengelola kode akses, bank soal, serta hasil psikotest kandidat.",
      },
      { property: "og:title", content: "Login Admin HR — PT Dover Chemical" },
      {
        property: "og:description",
        content:
          "Halaman masuk administrator dan tim HR PT Dover Chemical untuk mengelola kode akses, bank soal, serta hasil psikotest kandidat.",
      },
      { property: "og:url", content: "https://test-dovechem.lovable.app/auth" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://test-dovechem.lovable.app/auth" }],
  }),

  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const statusFn = useServerFn(bootstrapStatus);
  const bootstrapFn = useServerFn(createBootstrapAdmin);
  const [loading, setLoading] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin/dashboard" });
    });
    statusFn({ data: {} as never })
      .then((r) => setNeedsBootstrap(r.needsBootstrap))
      .catch(() => setNeedsBootstrap(false));
  }, [navigate, statusFn]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    toast.success("Berhasil login");
    navigate({ to: "/admin/dashboard" });
  }

  async function handleBootstrap(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await bootstrapFn({ data: { email, password, full_name: fullName, username } });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Super Admin dibuat & login berhasil");
      navigate({ to: "/admin/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Gagal membuat admin");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-hero p-4">
      <div className="mx-auto max-w-md pt-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <Card className="shadow-elegant">
          <CardHeader className="text-center">
            <img
              src={doverLogo.url}
              alt="Logo PT Dover Chemical"
              className="mx-auto h-12 w-auto object-contain"
            />
            <h1 className="mt-3 font-display text-2xl font-semibold leading-none tracking-tight">
              {needsBootstrap ? "Setup Super Admin" : "Portal Admin HR"}
            </h1>
            <CardDescription>PT Dover Chemical — Recruitment Management</CardDescription>
          </CardHeader>
          <CardContent>
            {needsBootstrap === null ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Memuat...</div>
            ) : needsBootstrap ? (
              <form onSubmit={handleBootstrap} className="space-y-4">
                <div className="rounded-md border border-secondary/40 bg-secondary/10 p-3 text-xs text-secondary-foreground">
                  Belum ada admin terdaftar. Buat akun Super Admin pertama untuk memulai. Setelah
                  ini, hanya admin yang bisa membuat user baru.
                </div>
                <div className="space-y-2">
                  <Label>Nama Lengkap</Label>
                  <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input required value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password (min 8 karakter)</Label>
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Memproses..." : "Buat Super Admin"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="e">Email</Label>
                  <Input
                    id="e"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p">Password</Label>
                  <Input
                    id="p"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Memproses..." : "Login"}
                </Button>
                <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" /> Registrasi ditutup — akun dibuat oleh admin.
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
