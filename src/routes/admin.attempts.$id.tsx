import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAttemptDetail } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileDown, FileSpreadsheet } from "lucide-react";
import { exportMbtiPdf } from "@/lib/mbti-pdf";
import { exportMbtiExcel } from "@/lib/mbti-excel";
import { exportEqExcel } from "@/lib/eq-excel";
import { exportWptExcel } from "@/lib/wpt-excel";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/attempts/$id")({ component: AttemptDetail });

function AttemptDetail() {
  const { id } = Route.useParams();
  const fn = useServerFn(getAttemptDetail);
  const { data, isLoading } = useQuery({ queryKey: ["admin-attempt", id], queryFn: () => fn({ data: { id } }) });

  if (isLoading || !data) return <div className="text-muted-foreground">Memuat...</div>;
  const a = data.attempt as any;
  const t = a.tests;
  const answerMap = new Map<string, any>((a.test_answers ?? []).map((x: any) => [x.question_id, x]));
  const isDisc = t?.test_type === "disc";
  const isMbti = t?.test_type === "mbti";
  const isEq = t?.test_type === "eq";
  const candId = a.candidates?.id;

  return (
    <div className="space-y-6 print-area">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/candidates/$id" params={{ id: candId }}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke kandidat</Link>
        </Button>
        <div className="flex gap-2">
          {isMbti && a.result?.type && (
            <Button size="sm" variant="secondary" onClick={() => exportMbtiPdf(a.result, {
              candidateName: a.candidates?.full_name,
              candidateCode: a.candidates?.candidate_codes?.code ?? a.candidates?.code_snapshot,
              position: a.candidates?.position ?? undefined,
              attemptId: a.id,
              finishedAt: a.finished_at,
              score: a.score,
            })}>
              <FileDown className="mr-2 h-4 w-4" /> Unduh PDF MBTI
            </Button>
          )}
          {isMbti && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const rows = (data.questions as any[]).map((q) => ({
                    question_number: q.question_number,
                    answer: answerMap.get(q.id)?.answer,
                  }));
                  const { filled, type, valid } = await exportMbtiExcel(rows, {
                    candidateName: a.candidates?.full_name,
                    candidateCode: a.candidates?.candidate_codes?.code ?? a.candidates?.code_snapshot,
                    position: a.candidates?.position ?? null,
                    finishedAt: a.finished_at,
                  });
                  toast.success(
                    `Excel MBTI diunduh — tipe ${type} (${filled}/60 jawaban${valid ? "" : ", cek ulang isian"})`,
                  );
                } catch (e: any) {
                  toast.error(e?.message ?? "Gagal membuat file Excel");
                }
              }}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Ekspor Excel MBTI
            </Button>
          )}
          {isEq && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const rows = (data.questions as any[]).map((q) => ({
                    question_number: q.question_number,
                    answer: answerMap.get(q.id)?.answer,
                  }));
                  const { filled, strongest, summary } = await exportEqExcel(rows, {
                    candidateName: a.candidates?.full_name,
                    candidateCode: a.candidates?.candidate_codes?.code ?? a.candidates?.code_snapshot,
                    position: a.candidates?.position ?? null,
                    finishedAt: a.finished_at,
                  });
                  toast.success(
                    `Excel EQ diunduh — terkuat ${summary[strongest].label} (${filled}/50 jawaban)`,
                  );
                } catch (e: any) {
                  toast.error(e?.message ?? "Gagal membuat file Excel");
                }
              }}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Ekspor Excel EQ
            </Button>
          )}
          <Button size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Cetak</Button>
        </div>
      </div>
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">Lembar Jawaban — {t?.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{a.candidates?.full_name}</span>
          <span className="font-mono">{a.candidates?.candidate_codes?.code ?? a.candidates?.code_snapshot ?? "-"}</span>
          <Badge variant="outline" className="uppercase">{t?.test_type}</Badge>
          <Badge className={a.status === "finished" ? "bg-success" : ""} variant={a.status === "finished" ? "default" : "secondary"}>
            {a.status === "finished" ? `Skor: ${a.score}` : "Belum selesai"}
          </Badge>
        </div>
      </div>

      {a.result && (
        <Card className="shadow-card">
          <CardHeader><CardTitle>Ringkasan Hasil</CardTitle></CardHeader>
          <CardContent>
            {isDisc && a.result.most ? (
              <div>
                <div className="mb-2 text-sm">Dominan: <b className="text-primary">{a.result.dominant}</b></div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {(["D","I","S","C"] as const).map((k) => (
                    <div key={k} className="rounded border bg-muted/40 p-2">
                      <div className="text-lg font-bold text-primary">{k}</div>
                      <div>Most: <b>{a.result.most?.[k] ?? 0}</b></div>
                      <div>Least: <b>{a.result.least?.[k] ?? 0}</b></div>
                      <div>Change: <b>{a.result.change?.[k] ?? 0}</b></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">{JSON.stringify(a.result, null, 2)}</pre>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {data.questions.map((q: any, i: number) => {
          const ans = answerMap.get(q.id);
          let disc: { most?: string; least?: string } | null = null;
          if (isDisc && ans?.answer) { try { disc = JSON.parse(ans.answer); } catch { disc = null; } }
          const correct = !isDisc && q.correct_answer && ans?.answer === q.correct_answer;
          return (
            <Card key={q.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between text-xs uppercase text-muted-foreground">
                  <span>{isDisc ? `Kelompok ${i + 1}` : `Soal ${i + 1}`}</span>
                  {!isDisc && q.correct_answer && (
                    <Badge className={correct ? "bg-success" : "bg-destructive"}>{correct ? "Benar" : "Salah"}</Badge>
                  )}
                </div>
                {q.question_text && <div className="mb-2 text-sm font-medium">{q.question_text}</div>}
                {isDisc ? (
                  <div className="overflow-hidden rounded-md border text-sm">
                    {(q.options ?? []).map((opt: any) => {
                      const isMost = disc?.most === opt.key;
                      const isLeast = disc?.least === opt.key;
                      return (
                        <div key={opt.key} className="grid grid-cols-[1fr_64px_64px] items-center border-t first:border-t-0">
                          <div className="px-3 py-2">{opt.label} <span className="text-xs text-muted-foreground">({opt.dimension})</span></div>
                          <div className={`border-l py-2 text-center ${isMost ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"}`}>{isMost ? "M" : "·"}</div>
                          <div className={`border-l py-2 text-center ${isLeast ? "bg-destructive text-destructive-foreground font-bold" : "text-muted-foreground"}`}>{isLeast ? "L" : "·"}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1 text-sm">
                    {(q.options ?? []).map((opt: any) => {
                      const picked = ans?.answer === opt.key;
                      const isKey = q.correct_answer === opt.key;
                      return (
                        <div key={opt.key} className={`flex items-center gap-2 rounded border p-2 ${isKey ? "border-success bg-success/10" : ""} ${picked && !isKey ? "border-destructive bg-destructive/10" : ""}`}>
                          <span className="font-mono">{opt.key}.</span>
                          <span className="flex-1">{opt.label}</span>
                          {picked && <Badge variant="outline">Jawaban</Badge>}
                          {isKey && <Badge className="bg-success">Kunci</Badge>}
                        </div>
                      );
                    })}
                    {!ans && <div className="text-xs italic text-muted-foreground">Tidak dijawab</div>}
                    {ans && !(q.options ?? []).some((o: any) => o.key === ans.answer) && (
                      <div className="rounded border bg-muted/40 p-2 text-xs">Jawaban: <b>{ans.answer}</b></div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
