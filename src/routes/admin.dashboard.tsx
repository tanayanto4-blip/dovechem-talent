import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dashboardStats } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, KeyRound, ClipboardCheck, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Admin — PT Dover Chemical" },
      {
        name: "description",
        content:
          "Ringkasan kandidat aktif, kode akses, dan progres pengerjaan psikotest PT Dover Chemical.",
      },
      { property: "og:title", content: "Dashboard Admin — PT Dover Chemical" },
      {
        property: "og:description",
        content:
          "Ringkasan kandidat aktif, kode akses, dan progres pengerjaan psikotest PT Dover Chemical.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const stats = useServerFn(dashboardStats);
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => stats({ data: {} as never }),
  });

  const cards = [
    {
      label: "Total Kode",
      value: data?.total_codes ?? "-",
      sub: `${data?.active_codes ?? 0} aktif`,
      icon: KeyRound,
    },
    {
      label: "Kandidat",
      value: data?.total_candidates ?? "-",
      sub: `${data?.completed_profiles ?? 0} lengkap`,
      icon: Users,
    },
    {
      label: "Test Diselesaikan",
      value: data?.finished_attempts ?? "-",
      sub: `${data?.total_attempts ?? 0} total attempt`,
      icon: ClipboardCheck,
    },
    {
      label: "Sedang Mengerjakan",
      value: data?.in_progress_attempts ?? "-",
      sub: "kandidat aktif mengerjakan test",
      icon: TrendingUp,
    },
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

      <Card>
        <CardHeader>
          <CardTitle>Selamat datang</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Gunakan menu <b>Kode Kandidat</b> untuk membuat kode akses baru bagi kandidat.
          </p>
          <p>
            Buka <b>Kandidat</b> untuk melihat progress pengisian data, berkas, dan hasil psikotest.
          </p>
          <p>
            Kandidat login di{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">/candidate/login</code> menggunakan
            kode yang Anda buat.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
