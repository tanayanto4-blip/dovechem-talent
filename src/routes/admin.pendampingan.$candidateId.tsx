import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminAssistOverview,
  adminAssistTest,
  adminSaveAssistedAnswers,
  adminReopenAttempt,
} from "@/lib/admin-assist.functions";
import { testDisplayName } from "@/lib/test-display-name";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, CheckCircle2, Unlock, RefreshCw } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/admin/pendampingan/$candidateId")({
  head: () => ({
    meta: [
      { title: "Pendampingan Pengisian Test — DOVECHEM TALENT" },
      {
        name: "description",
        content:
          "Super Admin dan HR melengkapi jawaban test kandidat yang belum terisi serta meninjau soal per test.",
      },
      { property: "og:title", content: "Pendampingan Pengisian Test — DOVECHEM TALENT" },
      {
        property: "og:description",
        content:
          "Super Admin dan HR melengkapi jawaban test kandidat yang belum terisi serta meninjau soal per test.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssistPage,
});

function AssistPage() {
  const { candidateId } = Route.useParams();
  const qc = useQueryClient();
  const overviewFn = useServerFn(adminAssistOverview);
  const testFn = useServerFn(adminAssistTest);
  const saveFn = useServerFn(adminSaveAssistedAnswers);
  const reopenFn = useServerFn(adminReopenAttempt);

  const [testId, setTestId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [onlyEmpty, setOnlyEmpty] = useState(false);

  const { data: overview } = useQuery({
    queryKey: ["assist-overview", candidateId],
    queryFn: () => overviewFn({ data: { candidate_id: candidateId } }),
  });

  const { data: testData } = useQuery({
    queryKey: ["assist-test", candidateId, testId],
    queryFn: () => testFn({ data: { candidate_id: candidateId, test_id: testId! } }),
    enabled: !!testId,
  });

  const savedAnswers = useMemo(() => {
    const m: Record<string, string> = {};
    for (const a of (testData?.answers ?? []) as any[]) m[a.question_id] = a.answer ?? "";
    return m;
  }, [testData]);

  const value = (qid: string) => draft[qid] ?? savedAnswers[qid] ?? "";

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["assist-test", candidateId, testId] });
    await qc.invalidateQueries({ queryKey: ["assist-overview", candidateId] });
    await qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
  }

  async function submit(finalize: boolean) {
    if (!testId) return;
    setBusy(true);
    try {
      const qs = (testData?.questions ?? []) as any[];
      // Kirim semua soal: yang kosong akan menghapus jawaban lama (koreksi).
      const answers = qs.map((q) => ({ question_id: q.id, answer: value(q.id) }));
      const res = await saveFn({
        data: { candidate_id: candidateId, test_id: testId, answers, finalize },
      });
      toast.success(
        res.rescored
          ? `Jawaban disimpan & dinilai ulang (${res.saved} soal terisi, skor ${res.score ?? 0}).`
          : `Jawaban tersimpan (${res.saved} soal terisi).`,
      );
      setDraft({});
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reopen() {
    if (!testId) return;
    setBusy(true);
    try {
      await reopenFn({ data: { candidate_id: candidateId, test_id: testId } });
      toast.success("Test dibuka kembali. Kandidat bisa melanjutkan pengerjaan.");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const c = overview?.candidate as any;
  const tests = (overview?.tests ?? []) as any[];
  const questions = (testData?.questions ?? []) as any[];
  const filledCount = questions.filter((q) => value(q.id).trim() !== "").length;
  const attemptStatus = (testData?.attempt as any)?.status ?? null;
  const visibleQuestions = onlyEmpty
    ? questions.filter((q) => value(q.id).trim() === "")
    : questions;


  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/candidates/$id" params={{ id: candidateId }}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Detail Kandidat
        </Link>
      </Button>

      <div>
        <h1 className="font-display text-2xl font-bold text-primary md:text-3xl">
          Pendampingan Pengisian Test
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {c?.full_name ?? "Kandidat"} · {c?.candidate_codes?.code ?? c?.code_snapshot ?? "-"}
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Daftar Test Kandidat</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {tests.length === 0 ? (
            <div className="text-sm text-muted-foreground">Belum ada test aktif untuk jalur ini.</div>
          ) : (
            tests.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTestId(t.id);
                  setDraft({});
                }}
                className={`rounded-md border p-3 text-left transition ${
                  testId === t.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <div className="font-semibold">{testDisplayName(t)}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  {t.attempt?.status === "finished" ? (
                    <Badge className="bg-success">Selesai · Skor {t.attempt.score ?? 0}</Badge>
                  ) : t.attempt ? (
                    <Badge variant="secondary">Sedang berjalan</Badge>
                  ) : (
                    <Badge variant="outline">Belum dikerjakan</Badge>
                  )}
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {testId ? (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex flex-wrap items-center gap-2">
                {testDisplayName(testData?.test as any)}
                {attemptStatus === "finished" ? (
                  <Badge className="bg-success">Sudah dikerjakan</Badge>
                ) : attemptStatus ? (
                  <Badge variant="secondary">Sedang berjalan</Badge>
                ) : null}
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {filledCount}/{questions.length} soal terisi
              </span>
            </CardTitle>
            {attemptStatus === "finished" ? (
              <p className="text-xs text-muted-foreground">
                Test ini sudah selesai. Setiap perubahan jawaban akan otomatis dinilai ulang.
                Kosongkan kolom jawaban untuk menghapus jawaban yang salah.
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={onlyEmpty ? "default" : "outline"}
                onClick={() => setOnlyEmpty((v) => !v)}
              >
                {onlyEmpty ? "Tampilkan Semua Soal" : "Tampilkan Soal Kosong Saja"}
              </Button>
              {attemptStatus === "finished" ? (
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={reopen}>
                  <Unlock className="mr-2 h-4 w-4" /> Buka Kembali untuk Kandidat
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={refresh}>
                <RefreshCw className="mr-2 h-4 w-4" /> Muat Ulang
              </Button>
            </div>

            {questions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Belum ada soal aktif pada test ini.
              </div>
            ) : visibleQuestions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Semua soal sudah terisi.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleQuestions.map((q) => {

                  const opts = Array.isArray(q.options) ? q.options : null;
                  return (
                    <div key={q.id} className="rounded-md border p-3">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">
                        Soal {q.question_number}
                        {q.dimension ? ` · ${q.dimension}` : ""}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-sm font-medium">
                        {q.question_text}
                      </div>
                      {opts ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {opts.map((o: any, i: number) => {
                            const key = String(o?.key ?? o?.value ?? o ?? i);
                            const label = String(o?.text ?? o?.label ?? o ?? key);
                            const active = value(q.id) === key;
                            return (
                              <Button
                                key={`${q.id}-${key}-${i}`}
                                type="button"
                                size="sm"
                                variant={active ? "default" : "outline"}
                                onClick={() => setDraft((d) => ({ ...d, [q.id]: key }))}
                              >
                                <span className="font-mono mr-1">{key}</span>
                                <span className="max-w-[220px] truncate">{label}</span>
                              </Button>
                            );
                          })}
                        </div>
                      ) : null}
                      <Input
                        className="mt-2"
                        placeholder="Jawaban kandidat"
                        value={value(q.id)}
                        onChange={(e) => setDraft((d) => ({ ...d, [q.id]: e.target.value }))}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => submit(false)} variant="outline">
                <Save className="mr-2 h-4 w-4" /> Simpan Jawaban
              </Button>
              <Button disabled={busy} onClick={() => submit(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4" />{" "}
                {attemptStatus === "finished" ? "Simpan & Nilai Ulang" : "Simpan & Nilai (Selesaikan)"}
              </Button>
            </div>

          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
