import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dashboardStats, listAllAttempts } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, KeyRound, ClipboardCheck, TrendingUp, BarChart3, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({ component: Dashboard });

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleString("id-ID") : "-";
}

function Dashboard() {
  const stats = useServerFn(dashboardStats);
  const { data } = useQuery({ queryKey: ["admin-stats"], queryFn: () => stats({ data: {} as never }) });
  const attemptsFn = useServerFn(listAllAttempts);
  const { data: attemptsData, isLoading: loadingAttempts } = useQuery({
    queryKey: ["admin-dashboard-attempts"],
    queryFn: () => attemptsFn({ data: { limit: 8 } }),
  });
  const recent = (attemptsData?.attempts ?? []) as any[];

  const cards = [
    { label: "Total Kode", value: data?.total_codes ?? "-", sub: `${data?.active_codes ?? 0} aktif`, icon: KeyRound },
    { label: "Kandidat", value: data?.total_candidates ?? "-", sub: `${data?.completed_profiles ?? 0} lengkap`, icon: Users },
    { label: "Test Diselesaikan", value: data?.finished_attempts ?? "-", sub: `${data?.total_attempts ?? 0} total attempt`, icon: ClipboardCheck },
    { label: "Rata-rata Skor", value: data?.avg_score ?? "-", sub: "seluruh test", icon: TrendingUp },
  ];


  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">Dashboard</h1>
        <p className="text-muted-foreground">Ringkasan aktivitas rekrutmen PT Dover Chemical.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">{c.label}</div>
                  <div className="mt-2 font-display text-3xl font-bold text-primary">{c.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{c.sub}</div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-md bg-hero text-primary-foreground">
                  <c.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" /> Bank Data Hasil
          </CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/results">
              Buka semua hasil <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loadingAttempts ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Memuat hasil psikotest...</div>
          ) : recent.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Belum ada hasil psikotest.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-2">Kandidat</th>
                  <th className="py-2 pr-2">Test</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Skor</th>
                  <th className="py-2 pr-2">Waktu</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {recent.map((r: any) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <div className="font-medium">{r.candidates?.full_name ?? "(Tanpa Nama)"}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {r.candidates?.candidate_codes?.code ?? r.candidates?.code_snapshot ?? "-"}
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      {r.tests?.name ?? "-"}
                      <div><Badge variant="outline" className="mt-1 uppercase">{r.tests?.test_type}</Badge></div>
                    </td>
                    <td className="py-2 pr-2">
                      {r.status === "finished" ? <Badge className="bg-success">Selesai</Badge> : <Badge variant="secondary">Berjalan</Badge>}
                    </td>
                    <td className="py-2 pr-2 font-semibold text-primary">{r.status === "finished" ? (r.score ?? "-") : "-"}</td>
                    <td className="py-2 pr-2 text-xs text-muted-foreground">{fmt(r.finished_at ?? r.started_at)}</td>
                    <td className="py-2 text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/admin/attempts/$id" params={{ id: r.id }}>Detail</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader><CardTitle>Selamat datang</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Gunakan menu <b>Kode Kandidat</b> untuk membuat kode akses baru bagi kandidat.</p>
          <p>Buka <b>Kandidat</b> untuk melihat progress pengisian data, berkas, dan hasil psikotest.</p>
          <p>Kandidat login di <code className="rounded bg-muted px-1.5 py-0.5">/candidate/login</code> menggunakan kode yang Anda buat.</p>
        </CardContent>
      </Card>
    </div>
  );
}
