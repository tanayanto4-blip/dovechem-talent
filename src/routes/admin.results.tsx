import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllAttempts } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDown, Eye, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/admin/results")({
  component: ResultsBank,
  head: () => ({
    meta: [
      { title: "Bank Data Hasil Psikotest | Dover Chemical HR" },
      { name: "description", content: "Rekap seluruh hasil psikotest kandidat PT Dover Chemical untuk admin dan HR." },
      { property: "og:title", content: "Bank Data Hasil Psikotest | Dover Chemical HR" },
      { property: "og:description", content: "Rekap seluruh hasil psikotest kandidat PT Dover Chemical untuk admin dan HR." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleString("id-ID") : "-";
}

function ResultsBank() {
  const fn = useServerFn(listAllAttempts);
  const { data, isLoading } = useQuery({ queryKey: ["admin-all-attempts"], queryFn: () => fn({ data: {} as never }) });
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  const rows = useMemo(() => {
    const all = (data?.attempts ?? []) as any[];
    const needle = q.trim().toLowerCase();
    return all.filter((a) => {
      if (type !== "all" && a.tests?.test_type !== type) return false;
      if (status !== "all" && a.status !== status) return false;
      if (!needle) return true;
      return [a.candidates?.full_name, a.candidates?.candidate_codes?.code, a.candidates?.position_applied, a.tests?.name]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(needle));
    });
  }, [data, q, type, status]);

  const types = useMemo(
    () => Array.from(new Set(((data?.attempts ?? []) as any[]).map((a) => a.tests?.test_type).filter(Boolean))),
    [data],
  );

  const finished = rows.filter((r) => r.status === "finished");
  const avg = finished.length
    ? Math.round(finished.reduce((s, r) => s + Number(r.score ?? 0), 0) / finished.length)
    : 0;

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["No", "Kandidat", "Kode", "Posisi", "Test", "Tipe", "Status", "Skor", "Ringkasan", "Mulai", "Selesai"];
    const lines = [header.map(esc).join(",")];
    rows.forEach((r, i) => {
      lines.push([
        i + 1,
        r.candidates?.full_name ?? "-",
        r.candidates?.candidate_codes?.code ?? "-",
        r.candidates?.position_applied ?? "-",
        r.tests?.name ?? "-",
        r.tests?.test_type ?? "-",
        r.status,
        r.status === "finished" ? (r.score ?? "") : "",
        summarize(r),
        fmt(r.started_at),
        fmt(r.finished_at),
      ].map(esc).join(","));
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bank-hasil-psikotest-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Bank Data Hasil</h1>
          <p className="text-sm text-muted-foreground">
            Seluruh hasil psikotest kandidat. Hanya dapat diakses oleh Admin &amp; HR — kandidat tidak dapat melihat skor.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!rows.length}>
          <FileDown className="mr-2 h-4 w-4" /> Ekspor CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Attempt", value: rows.length },
          { label: "Selesai", value: finished.length },
          { label: "Rata-rata Skor", value: avg },
        ].map((c) => (
          <Card key={c.label} className="shadow-card">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <div className="text-sm text-muted-foreground">{c.label}</div>
                <div className="mt-1 font-display text-2xl font-bold text-primary">{c.value}</div>
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader className="gap-3">
          <CardTitle className="text-base">Rekap Hasil Psikotest</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              placeholder="Cari nama / kode / posisi / test..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="all">Semua tipe</option>
              {types.map((t) => (
                <option key={t as string} value={t as string}>{String(t).toUpperCase()}</option>
              ))}
            </select>
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Semua status</option>
              <option value="finished">Selesai</option>
              <option value="in_progress">Berjalan</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Memuat...</div>
          ) : !rows.length ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Belum ada hasil psikotest.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-2">No</th>
                  <th className="py-2 pr-2">Kandidat</th>
                  <th className="py-2 pr-2">Kode</th>
                  <th className="py-2 pr-2">Test</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Skor</th>
                  <th className="py-2 pr-2">Ringkasan</th>
                  <th className="py-2 pr-2">Selesai</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 pr-2 font-medium">
                      {r.candidates?.full_name ?? "-"}
                      <div className="text-xs text-muted-foreground">{r.candidates?.position_applied ?? "-"}</div>
                    </td>
                    <td className="py-2 pr-2 font-mono text-xs">{r.candidates?.candidate_codes?.code ?? "-"}</td>
                    <td className="py-2 pr-2">
                      {r.tests?.name ?? "-"}
                      <div><Badge variant="outline" className="mt-1 uppercase">{r.tests?.test_type}</Badge></div>
                    </td>
                    <td className="py-2 pr-2">
                      {r.status === "finished" ? <Badge className="bg-success">Selesai</Badge> : <Badge variant="secondary">Berjalan</Badge>}
                    </td>
                    <td className="py-2 pr-2 font-semibold text-primary">{r.status === "finished" ? (r.score ?? "-") : "-"}</td>
                    <td className="py-2 pr-2 text-xs text-muted-foreground">{summarize(r)}</td>
                    <td className="py-2 pr-2 text-xs text-muted-foreground">{fmt(r.finished_at)}</td>
                    <td className="py-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/admin/attempts/$id" params={{ id: r.id }}><Eye className="mr-1 h-3.5 w-3.5" /> Detail</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function summarize(r: any) {
  const res = r.result ?? {};
  const t = r.tests?.test_type;
  if (t === "mbti" && res.type) return `Tipe ${res.type}`;
  if (t === "disc" && res.dominant) return `Dominan ${res.dominant}`;
  if (t === "eq" && res.dominant) return `Terkuat ${res.dominant}`;
  if (res.requires_manual_review) return "Perlu penilaian manual";
  return "-";
}
