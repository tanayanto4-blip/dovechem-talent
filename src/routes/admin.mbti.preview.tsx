import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listTests, getTestWithQuestions } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Eye, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/mbti/preview")({
  head: () => ({
    meta: [
      { title: "Preview Set Soal MBTI — Admin" },
      { name: "description", content: "Ringkasan set soal MBTI yang sedang berstatus publish beserta preview tampilan kandidat." },
          { property: "og:title", content: "Preview Set Soal MBTI — Admin" },
      { property: "og:description", content: "Ringkasan set soal MBTI yang sedang berstatus publish beserta preview tampilan kandidat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
],
  }),
  component: MbtiPreview,
});

const DIM_PAIRS = [
  { key: "EI", labels: ["E", "I"] as const, title: "Extraversion / Introversion" },
  { key: "SN", labels: ["S", "N"] as const, title: "Sensing / Intuition" },
  { key: "TF", labels: ["T", "F"] as const, title: "Thinking / Feeling" },
  { key: "JP", labels: ["J", "P"] as const, title: "Judging / Perceiving" },
] as const;

function MbtiPreview() {
  const listFn = useServerFn(listTests);
  const detailFn = useServerFn(getTestWithQuestions);
  const { data: testsData, isLoading: loadingTests } = useQuery({
    queryKey: ["admin-tests"],
    queryFn: () => listFn(),
  });

  const mbtiTests = useMemo(
    () => ((testsData?.tests ?? []) as any[]).filter((t) => t.test_type === "mbti"),
    [testsData],
  );
  const published = useMemo(() => mbtiTests.filter((t) => t.active), [mbtiTests]);
  const [testId, setTestId] = useState<string | null>(null);
  const activeId = testId ?? published[0]?.id ?? mbtiTests[0]?.id ?? null;
  const activeTest = mbtiTests.find((t) => t.id === activeId);

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["admin-mbti-preview", activeId],
    queryFn: () => detailFn({ data: { id: activeId! } }),
    enabled: !!activeId,
  });

  const questions = useMemo(() => (detail?.questions ?? []) as any[], [detail]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    const numbers = new Set<number>();
    const dups: number[] = [];
    let invalid = 0;
    let empty = 0;
    questions.forEach((q) => {
      if (numbers.has(q.question_number)) dups.push(q.question_number);
      numbers.add(q.question_number);
      const opts = q.options ?? [];
      const a = opts.find((o: any) => o.key === "A");
      const b = opts.find((o: any) => o.key === "B");
      if (!a?.label?.trim() || !b?.label?.trim()) empty++;
      const ad = a?.dimension as string | undefined;
      const bd = b?.dimension as string | undefined;
      if (ad && counts[ad] !== undefined) counts[ad]++;
      if (bd && counts[bd] !== undefined) counts[bd]++;
      const validPair = ad && bd && ad !== bd && DIM_PAIRS.some((p) => (p.labels as readonly string[]).includes(ad) && (p.labels as readonly string[]).includes(bd));
      if (!validPair) invalid++;
    });
    const max = questions.length ? Math.max(...Array.from(numbers)) : 0;
    const missing: number[] = [];
    for (let i = 1; i <= max; i++) if (!numbers.has(i)) missing.push(i);
    return { counts, dups: Array.from(new Set(dups)), missing, invalid, empty, total: questions.length };
  }, [questions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="mb-1">
            <Button asChild variant="ghost" size="sm"><Link to="/admin/mbti"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Bank Soal</Link></Button>
          </div>
          <h1 className="font-display text-2xl font-bold text-primary">Preview Set Soal MBTI</h1>
          <p className="text-sm text-muted-foreground">Ringkasan set soal yang sedang berstatus publish beserta tampilan yang akan dilihat kandidat.</p>
        </div>
        {mbtiTests.length > 1 && (
          <Select value={activeId ?? undefined} onValueChange={setTestId}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Pilih test" /></SelectTrigger>
            <SelectContent>
              {mbtiTests.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} {t.active ? "· Published" : "· Draft"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loadingTests ? (
        <div className="text-muted-foreground">Memuat...</div>
      ) : !mbtiTests.length ? (
        <div className="rounded-md border bg-muted/40 p-6 text-sm text-muted-foreground">Belum ada test bertipe MBTI.</div>
      ) : !activeTest ? (
        <div className="rounded-md border bg-muted/40 p-6 text-sm text-muted-foreground">Pilih test untuk melihat preview.</div>
      ) : (
        <>
          <Card className="shadow-card">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold">{activeTest.name}</div>
                  <Badge variant="outline" className="uppercase">{activeTest.test_type}</Badge>
                  <Badge className={activeTest.active ? "bg-success" : ""} variant={activeTest.active ? "default" : "secondary"}>
                    {activeTest.active ? "Published" : "Draft"}
                  </Badge>
                  <Badge variant="secondary">{stats.total} soal</Badge>
                </div>
                {activeTest.description && <div className="mt-1 text-xs text-muted-foreground">{activeTest.description}</div>}
              </div>
              {!activeTest.active && (
                <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                  <AlertTriangle className="h-4 w-4" /> Test ini belum dipublikasikan. Aktifkan toggle Publish di Bank Soal untuk merilis.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader className="pb-2"><CardTitle className="text-base">Distribusi Dimensi</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {DIM_PAIRS.map((p) => {
                    const [x, y] = p.labels;
                    const cx = stats.counts[x] ?? 0;
                    const cy = stats.counts[y] ?? 0;
                    const total = Math.max(1, cx + cy);
                    const lw = (cx / total) * 100;
                    const balanced = cx === cy;
                    return (
                      <div key={p.key}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{p.title}</span>
                          <span className="font-mono">{x}: <b>{cx}</b> · {y}: <b>{cy}</b> {balanced && <span className="ml-1 text-success">seimbang</span>}</span>
                        </div>
                        <div className="flex h-2 overflow-hidden rounded bg-muted">
                          <div className="bg-primary" style={{ width: `${lw}%` }} />
                          <div className="bg-primary/30" style={{ width: `${100 - lw}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="pb-2"><CardTitle className="text-base">Cek Kualitas Set</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <QaRow ok={stats.total > 0} okText={`${stats.total} soal terdaftar`} failText="Belum ada soal" />
                  <QaRow ok={stats.dups.length === 0} okText="Tidak ada nomor ganda" failText={`Nomor duplikat: ${stats.dups.join(", ")}`} />
                  <QaRow ok={stats.missing.length === 0} okText="Nomor urut lengkap" failText={`Nomor hilang: ${stats.missing.slice(0, 12).join(", ")}${stats.missing.length > 12 ? "…" : ""}`} />
                  <QaRow ok={stats.invalid === 0} okText="Semua pasangan dimensi valid" failText={`${stats.invalid} soal dengan pasangan dimensi tidak valid`} />
                  <QaRow ok={stats.empty === 0} okText="Semua pernyataan terisi" failText={`${stats.empty} soal dengan pernyataan kosong`} />
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" /> Preview Tampilan Kandidat</CardTitle>
              <span className="text-xs text-muted-foreground">Menampilkan {questions.length} soal</span>
            </CardHeader>
            <CardContent>
              {loadingDetail ? (
                <div className="text-sm text-muted-foreground">Memuat soal...</div>
              ) : !questions.length ? (
                <div className="text-sm text-muted-foreground">Set soal masih kosong.</div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, i) => {
                    const a = (q.options ?? []).find((o: any) => o.key === "A");
                    const b = (q.options ?? []).find((o: any) => o.key === "B");
                    return (
                      <div key={q.id} className="rounded-md border p-3">
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="font-mono font-semibold text-muted-foreground">Soal #{q.question_number || i + 1}</span>
                          <Badge variant="outline">{a?.dimension ?? "?"} / {b?.dimension ?? "?"}</Badge>
                        </div>
                        {q.question_text && <div className="mb-2 text-xs text-muted-foreground">{q.question_text}</div>}
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded border bg-muted/30 p-3 text-sm">
                            <div className="mb-1 text-[11px] font-semibold text-primary">A · {a?.dimension ?? "?"}</div>
                            <div>{a?.label ?? <span className="italic text-muted-foreground">(kosong)</span>}</div>
                          </div>
                          <div className="rounded border bg-muted/30 p-3 text-sm">
                            <div className="mb-1 text-[11px] font-semibold text-primary">B · {b?.dimension ?? "?"}</div>
                            <div>{b?.label ?? <span className="italic text-muted-foreground">(kosong)</span>}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function QaRow({ ok, okText, failText }: { ok: boolean; okText: string; failText: string }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> : <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />}
      <span className={ok ? "" : "text-destructive"}>{ok ? okText : failText}</span>
    </li>
  );
}
