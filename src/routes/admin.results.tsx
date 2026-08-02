import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllAttempts, getAttemptDetail } from "@/lib/admin.functions";
import { exportMbtiExcel } from "@/lib/mbti-excel";
import { exportEqExcel } from "@/lib/eq-excel";
import { exportWptExcel } from "@/lib/wpt-excel";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDown, Eye, BarChart3, FolderOpen, ChevronDown, ChevronRight, Users, FileSpreadsheet } from "lucide-react";

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

function summarize(r: any) {
  const res = r.result ?? {};
  const t = r.tests?.test_type;
  if (t === "mbti" && res.type) return `Tipe ${res.type}`;
  if (t === "disc" && res.dominant) return `Dominan ${res.dominant}`;
  if (t === "eq" && res.dominant) return `Terkuat ${res.dominant}`;
  if (res.requires_manual_review) return "Perlu penilaian manual";
  return "-";
}

type Group = {
  key: string;
  name: string;
  code: string;
  position: string;
  attempts: any[];
  finished: number;
  first?: string | null;
  last?: string | null;
};

function ResultsBank() {
  const fn = useServerFn(listAllAttempts);
  const detailFn = useServerFn(getAttemptDetail);
  const { data, isLoading } = useQuery({ queryKey: ["admin-all-attempts"], queryFn: () => fn({ data: {} as never }) });
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const rows = useMemo(() => {
    const all = (data?.attempts ?? []) as any[];
    const needle = q.trim().toLowerCase();
    return all.filter((a) => {
      if (type !== "all" && a.tests?.test_type !== type) return false;
      if (status !== "all" && a.status !== status) return false;
      if (!needle) return true;
      return [a.candidates?.full_name, a.candidates?.candidate_codes?.code ?? a.candidates?.code_snapshot, a.candidates?.position_applied, a.tests?.name]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(needle));
    });
  }, [data, q, type, status]);

  // Kelompokkan per nama kandidat, urut test dari awal sampai akhir
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    rows.forEach((r) => {
      const c = r.candidates ?? {};
      const key = String(c.id ?? c.full_name ?? r.candidate_id ?? "tanpa-nama");
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          name: c.full_name ?? "(Tanpa Nama)",
          code: c.candidate_codes?.code ?? c.code_snapshot ?? "-",
          position: c.position_applied ?? "-",
          attempts: [],
          finished: 0,
        };
        map.set(key, g);
      }
      g.attempts.push(r);
    });
    const list = Array.from(map.values());
    list.forEach((g) => {
      g.attempts.sort((a, b) => new Date(a.started_at ?? 0).getTime() - new Date(b.started_at ?? 0).getTime());
      g.finished = g.attempts.filter((a) => a.status === "finished").length;
      g.first = g.attempts[0]?.started_at ?? null;
      g.last = g.attempts[g.attempts.length - 1]?.finished_at ?? g.attempts[g.attempts.length - 1]?.started_at ?? null;
    });
    list.sort((a, b) => a.name.localeCompare(b.name, "id"));
    return list;
  }, [rows]);

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
    const header = ["No", "Kandidat", "Kode", "Posisi", "Urutan Test", "Test", "Tipe", "Status", "Skor", "Ringkasan", "Mulai", "Selesai"];
    const lines = [header.map(esc).join(",")];
    groups.forEach((g, gi) => {
      g.attempts.forEach((r, ai) => {
        lines.push([
          gi + 1,
          g.name,
          g.code,
          g.position,
          ai + 1,
          r.tests?.name ?? "-",
          r.tests?.test_type ?? "-",
          r.status,
          r.status === "finished" ? (r.score ?? "") : "",
          summarize(r),
          fmt(r.started_at),
          fmt(r.finished_at),
        ].map(esc).join(","));
      });
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
            Tersimpan per nama kandidat — seluruh riwayat test dari awal sampai akhir. Hanya Admin &amp; HR yang dapat melihat skor.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!groups.length}>
          <FileDown className="mr-2 h-4 w-4" /> Ekspor CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Kandidat", value: groups.length, icon: Users },
          { label: "Total Attempt", value: rows.length, icon: BarChart3 },
          { label: "Selesai", value: finished.length, icon: BarChart3 },
          { label: "Rata-rata Skor", value: avg, icon: BarChart3 },
        ].map((c) => (
          <Card key={c.label} className="shadow-card">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <div className="text-sm text-muted-foreground">{c.label}</div>
                <div className="mt-1 font-display text-2xl font-bold text-primary">{c.value}</div>
              </div>
              <c.icon className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader className="gap-3">
          <CardTitle className="text-base">Rekap Hasil Psikotest per Kandidat</CardTitle>
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
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setOpen((o) => {
                  const allOpen = groups.every((g) => o[g.key]);
                  return allOpen ? {} : Object.fromEntries(groups.map((g) => [g.key, true]));
                })
              }
              disabled={!groups.length}
            >
              {groups.every((g) => open[g.key]) && groups.length ? "Tutup semua" : "Buka semua"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Memuat...</div>
          ) : !groups.length ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Belum ada hasil psikotest.</div>
          ) : (
            <div className="space-y-3">
              {groups.map((g, gi) => {
                const isOpen = !!open[g.key];
                return (
                  <div key={g.key} className="rounded-lg border">
                    <button
                      type="button"
                      onClick={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))}
                      className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <span className="w-6 text-sm text-muted-foreground">{gi + 1}.</span>
                      <FolderOpen className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{g.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{g.code}</span>
                      <span className="text-xs text-muted-foreground">{g.position}</span>
                      <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{g.attempts.length} test</Badge>
                        <Badge className="bg-success">{g.finished} selesai</Badge>
                        <span className="hidden sm:inline">Awal: {fmt(g.first)} → Akhir: {fmt(g.last)}</span>
                      </span>
                    </button>

                    {isOpen && (
                      <div className="overflow-x-auto border-t px-4 py-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                              <th className="py-2 pr-2">Urutan</th>
                              <th className="py-2 pr-2">Test</th>
                              <th className="py-2 pr-2">Status</th>
                              <th className="py-2 pr-2">Skor</th>
                              <th className="py-2 pr-2">Ringkasan</th>
                              <th className="py-2 pr-2">Mulai</th>
                              <th className="py-2 pr-2">Selesai</th>
                              <th className="py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {g.attempts.map((r, ai) => (
                              <Fragment key={r.id}>
                                <tr className="border-b last:border-0">
                                  <td className="py-2 pr-2 text-muted-foreground">{ai + 1}</td>
                                  <td className="py-2 pr-2">
                                    {r.tests?.name ?? "-"}
                                    <div><Badge variant="outline" className="mt-1 uppercase">{r.tests?.test_type}</Badge></div>
                                  </td>
                                  <td className="py-2 pr-2">
                                    {r.status === "finished" ? <Badge className="bg-success">Selesai</Badge> : <Badge variant="secondary">Berjalan</Badge>}
                                  </td>
                                  <td className="py-2 pr-2 font-semibold text-primary">{r.status === "finished" ? (r.score ?? "-") : "-"}</td>
                                  <td className="py-2 pr-2 text-xs text-muted-foreground">{summarize(r)}</td>
                                  <td className="py-2 pr-2 text-xs text-muted-foreground">{fmt(r.started_at)}</td>
                                  <td className="py-2 pr-2 text-xs text-muted-foreground">{fmt(r.finished_at)}</td>
                                  <td className="py-2">
                                    <div className="flex gap-2">
                                      <Button asChild size="sm" variant="outline">
                                        <Link to="/admin/attempts/$id" params={{ id: r.id }}><Eye className="mr-1 h-3.5 w-3.5" /> Detail</Link>
                                      </Button>
                                      {r.tests?.test_type === "mbti" && (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={async () => {
                                            try {
                                              const d: any = await detailFn({ data: { id: r.id } });
                                              const map = new Map<string, any>((d.attempt?.test_answers ?? []).map((x: any) => [x.question_id, x]));
                                              const rows = (d.questions ?? []).map((q: any) => ({
                                                question_number: q.question_number,
                                                answer: map.get(q.id)?.answer,
                                              }));
                                              const { filled, type } = await exportMbtiExcel(rows, {
                                                candidateName: g.name,
                                                candidateCode: g.code,
                                                position: g.position,
                                                finishedAt: r.finished_at,
                                              });
                                              toast.success(`Excel MBTI diunduh — tipe ${type} (${filled}/60 jawaban)`);
                                            } catch (e: any) {
                                              toast.error(e?.message ?? "Gagal membuat file Excel");
                                            }
                                          }}
                                        >
                                          <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel
                                        </Button>
                                      )}
                                      {r.tests?.test_type === "eq" && (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={async () => {
                                            try {
                                              const d: any = await detailFn({ data: { id: r.id } });
                                              const map = new Map<string, any>((d.attempt?.test_answers ?? []).map((x: any) => [x.question_id, x]));
                                              const rows = (d.questions ?? []).map((q: any) => ({
                                                question_number: q.question_number,
                                                answer: map.get(q.id)?.answer,
                                              }));
                                              const { filled, strongest, summary } = await exportEqExcel(rows, {
                                                candidateName: g.name,
                                                candidateCode: g.code,
                                                position: g.position,
                                                finishedAt: r.finished_at,
                                              });
                                              toast.success(`Excel EQ diunduh — terkuat ${summary[strongest].label} (${filled}/50 jawaban)`);
                                            } catch (e: any) {
                                              toast.error(e?.message ?? "Gagal membuat file Excel");
                                            }
                                          }}
                                        >
                                          <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel
                                        </Button>
                                      )}
                                      {r.tests?.test_type === "wpt" && (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={async () => {
                                            try {
                                              const d: any = await detailFn({ data: { id: r.id } });
                                              const map = new Map<string, any>((d.attempt?.test_answers ?? []).map((x: any) => [x.question_id, x]));
                                              const rows = (d.questions ?? []).map((q: any) => ({
                                                question_number: q.question_number,
                                                answer: map.get(q.id)?.answer,
                                              }));
                                              const { total, iq, category } = await exportWptExcel(rows, {
                                                candidateName: g.name,
                                                candidateCode: g.code,
                                                position: g.position,
                                                finishedAt: r.finished_at,
                                              });
                                              toast.success(`Excel WPT diunduh — benar ${total}/50, IQ ${iq} (${category})`);
                                            } catch (e: any) {
                                              toast.error(e?.message ?? "Gagal membuat file Excel");
                                            }
                                          }}
                                        >
                                          <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel
                                        </Button>
                                      )}
                                      {r.tests?.test_type === "papi" && (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={async () => {
                                            try {
                                              const d: any = await detailFn({ data: { id: r.id } });
                                              const map = new Map<string, any>((d.attempt?.test_answers ?? []).map((x: any) => [x.question_id, x]));
                                              const picks: Record<number, string> = {};
                                              for (const q of d.questions ?? []) {
                                                const ans = String(map.get(q.id)?.answer ?? "").trim().toUpperCase();
                                                if (ans === "A" || ans === "B") picks[q.question_number] = ans;
                                              }
                                              const res = await exportPapiExcel(picks, {
                                                candidateName: g.name,
                                                candidateCode: g.code,
                                                position: g.position,
                                                finishedAt: r.finished_at,
                                              });
                                              toast.success(`Excel PAPI diunduh — ${res.answered}/${res.total} item, skala tertinggi ${res.highest.join(", ") || "-"}`);
                                            } catch (e: any) {
                                              toast.error(e?.message ?? "Gagal membuat file Excel");
                                            }
                                          }}
                                        >
                                          <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel
                                        </Button>
                                      )}
                                      {r.tests?.test_type === "disc" && (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={async () => {
                                            try {
                                              const d: any = await detailFn({ data: { id: r.id } });
                                              const map = new Map<string, any>((d.attempt?.test_answers ?? []).map((x: any) => [x.question_id, x]));
                                              const rows = (d.questions ?? []).map((q: any) => ({
                                                question_number: q.question_number,
                                                answer: map.get(q.id)?.answer,
                                              }));
                                              const res: any = await exportDiscExcel(rows, {
                                                candidateName: g.name,
                                                candidateCode: g.code,
                                                position: g.position,
                                                finishedAt: r.finished_at,
                                              });
                                              toast.success(`Excel DISC diunduh — ${res?.filled ?? 0}/${res?.total ?? 24} kelompok terisi`);
                                            } catch (e: any) {
                                              toast.error(e?.message ?? "Gagal membuat file Excel");
                                            }
                                          }}
                                        >
                                          <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel
                                        </Button>
                                      )}
                                    </div>

                                  </td>
                                </tr>
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
