import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useServerFn } from "@tanstack/react-start";
import { candidateLogin } from "@/lib/candidate.functions";
import { setCandidateSession } from "@/lib/candidate-session";
import { toast } from "sonner";
import { Beaker, ArrowLeft, KeyRound } from "lucide-react";
import doverLogo from "@/assets/dover-logo.jpg.asset.json";

export const Route = createFileRoute("/candidate/login")({
  head: () => ({
    meta: [
      { title: "Login Kandidat — PT Dover Chemical" },
      { name: "description", content: "Masuk sebagai kandidat PT Dover Chemical menggunakan kode akses dari tim HR untuk mengisi biodata dan mengerjakan rangkaian psikotest online." },
      { property: "og:title", content: "Login Kandidat — PT Dover Chemical" },
      { property: "og:description", content: "Masuk sebagai kandidat PT Dover Chemical menggunakan kode akses dari tim HR untuk mengisi biodata dan mengerjakan rangkaian psikotest online." },
      { property: "og:url", content: "https://test-dovechem.lovable.app/candidate/login" },
    ],
    links: [{ rel: "canonical", href: "https://test-dovechem.lovable.app/candidate/login" }],
  }),
  // Rendered after hydration only: prevents a native form submit (and lost
  // input) when a candidate clicks "Masuk" before JS finishes loading.
  ssr: false,
  component: CandidateLogin,
});

function CandidateLogin() {
  const navigate = useNavigate();
  const login = useServerFn(candidateLogin);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ data: { code } });
      setCandidateSession({
        code: res.code,
        candidate_id: res.candidate.id,
        candidate_name: res.candidate.full_name ?? "Kandidat",
        device: res.device,
        type: res.candidate_type,
      });
      toast.success(`Selamat datang, ${res.candidate.full_name ?? "kandidat"}`);
      navigate({ to: "/candidate/portal" });
    } catch (e: any) {
      toast.error(e.message ?? "Kode tidak valid");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-hero p-4">
      <div className="mx-auto max-w-md pt-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <Card className="shadow-elegant">
          <CardHeader className="text-center">
            <img src={doverLogo.url} alt="Logo PT Dover Chemical" className="mx-auto h-12 w-auto object-contain" />
            <h1 className="mt-3 font-display text-2xl font-semibold leading-none tracking-tight">Login Kandidat — Portal Psikotest</h1>
            <CardDescription>Masukkan kode akses yang dikirim tim HR</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kode Akses</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="code"
                    required
                    autoFocus
                    placeholder="DOV-XXXXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="pl-9 uppercase tracking-widest"
                    maxLength={32}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Memverifikasi..." : "Masuk"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Belum punya kode? Hubungi tim rekrutmen PT Dover Chemical.</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
