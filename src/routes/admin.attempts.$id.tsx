import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAttemptDetail } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, FileSpreadsheet } from "lucide-react";
import { exportMbtiPdf } from "@/lib/mbti-pdf";
import { exportMbtiExcel } from "@/lib/mbti-excel";
import { exportEqExcel } from "@/lib/eq-excel";
import { exportWptExcel } from "@/lib/wpt-excel";
import { exportDiscExcel } from "@/lib/disc-excel";
import { exportPapiPdf } from "@/lib/papi-pdf";
import { exportPapiExcel } from "@/lib/papi-excel";
import { PauliResult } from "@/components/pauli-result";
import { papiScore, PAPI_SCALE_LABEL, PAPI_TOP_ORDER, PAPI_BOTTOM_ORDER } from "@/lib/papi-key";
import { msdtScore, MSDT_STYLE_COLUMNS, MSDT_STYLE_LABEL } from "@/lib/msdt-key";
import { rmibScore } from "@/lib/rmib-key";
import { exportMsdtExcel } from "@/lib/msdt-excel";
import { exportRmibExcel } from "@/lib/rmib-excel";
import { buildCandidateMeta } from "@/lib/candidate-meta";
import { BackButton } from "@/components/back-button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/attempts/$id")({
  head: () => ({
    meta: [
      { title: "Lembar Jawaban Kandidat — Admin Dover Chemical" },
      {
        name: "description",
        content:
          "Tinjau lembar jawaban dan skor satu sesi pengerjaan psikotest kandidat PT Dover Chemical.",
      },
      { property: "og:title", content: "Lembar Jawaban Kandidat — Admin Dover Chemical" },
      {
        property: "og:description",
        content:
          "Tinjau lembar jawaban dan skor satu sesi pengerjaan psikotest kandidat PT Dover Chemical.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AttemptDetail,
});

function AttemptDetail() {
  const { id } = Route.useParams();
  const fn = useServerFn(getAttemptDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-attempt", id],
    queryFn: () => fn({ data: { id } }),
  });

  if (isLoading || !data) return <div className="text-muted-foreground">Memuat...</div>;
  const a = data.attempt as any;
  const t = a.tests;
  const answerMap = new Map<string, any>(
    (a.test_answers ?? []).map((x: any) => [x.question_id, x]),
  );
  const isDisc = t?.test_type === "disc";
  const isMbti = t?.test_type === "mbti";
  const isEq = t?.test_type === "eq";
  const isWpt = t?.test_type === "wpt";
  const isPapi = t?.test_type === "papi";
  const isPauli = t?.test_type === "pauli";
  const isMsdt = t?.test_type === "msdt";
  const isRmib = t?.test_type === "rmib";
  const candId = a.candidates?.id;
  const papiPicks: Record<number, string> = {};
  if (isPapi) {
    for (const q of data.questions as any[]) {
      const ans = (answerMap.get(q.id)?.answer ?? "").trim().toUpperCase();
      if (ans === "A" || ans === "B") papiPicks[q.question_number] = ans;
    }
  }
  const papi = isPapi ? papiScore(papiPicks) : null;
  const msdtPicks: Record<number, string> = {};
  if (isMsdt) {
    for (const q of data.questions as any[]) {
      const ans = (answerMap.get(q.id)?.answer ?? "").trim().toUpperCase();
      if (ans === "A" || ans === "B") msdtPicks[q.question_number] = ans;
    }
  }
  const msdt = isMsdt ? msdtScore(msdtPicks) : null;

  const rmibGroups: Record<string, string> = {};
  if (isRmib) {
    for (const q of (data?.questions ?? []) as any[]) {
      const code = (q.options as any)?.code ?? String(q.question_number);
      rmibGroups[code] = String(answerMap.get(q.id)?.answer ?? "");
    }
  }
  const rmib = isRmib ? rmibScore(rmibGroups) : null;

  return (
    <div className="space-y-6 print-area">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <BackButton
          fallbackTo="/admin/candidates/$id"
          params={{ id: candId }}
          label="Kembali"
        />
        <div className="flex gap-2">
          {isMbti && a.result?.type && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                exportMbtiPdf(a.result, {
                  ...buildCandidateMeta(a.candidates, { finishedAt: a.finished_at }),
                  attemptId: a.id,
                  score: a.score,
                })
              }
            >
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
                    ...buildCandidateMeta(a.candidates, { finishedAt: a.finished_at }),
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
                    ...buildCandidateMeta(a.candidates, { finishedAt: a.finished_at }),
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
          {isDisc && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const rows = (data.questions as any[]).map((q) => ({
                    question_number: q.question_number,
                    answer: answerMap.get(q.id)?.answer,
                  }));
                  const { filled, total, valid } = await exportDiscExcel(rows, {
                    ...buildCandidateMeta(a.candidates, { finishedAt: a.finished_at }),
                  });
                  toast.success(
                    `Excel DISC diunduh — ${filled}/${total} kelompok terisi${valid ? "" : ", cek ulang isian"}`,
                  );
                } catch (e: any) {
                  toast.error(e?.message ?? "Gagal membuat file Excel");
                }
              }}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Ekspor Excel DISC
            </Button>
          )}
          {isWpt && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const rows = (data.questions as any[]).map((q) => ({
                    question_number: q.question_number,
                    answer: answerMap.get(q.id)?.answer,
                  }));
                  const { filled, total, iq, category } = await exportWptExcel(rows, {
                    ...buildCandidateMeta(a.candidates, { finishedAt: a.finished_at }),
                  });
                  toast.success(
                    `Excel WPT diunduh — benar ${total}/50, IQ ${iq} (${category}), ${filled} jawaban terisi`,
                  );
                } catch (e: any) {
                  toast.error(e?.message ?? "Gagal membuat file Excel");
                }
              }}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Ekspor Excel WPT
            </Button>
          )}
          {isPapi && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const res = await exportPapiPdf(papiPicks, {
                    ...buildCandidateMeta(a.candidates, { finishedAt: a.finished_at }),
                    startedAt: a.started_at,
                  });
                  toast.success(
                    `Lembar jawaban PAPI diunduh — ${res.answered}/90 terisi, skala tertinggi ${res.highest.join(", ") || "-"}`,
                  );
                } catch (e: any) {
                  toast.error(e?.message ?? "Gagal membuat lembar PAPI");
                }
              }}
            >
              <FileDown className="mr-2 h-4 w-4" /> Unduh Lembar Jawaban PAPI
            </Button>
          )}
          {isPapi && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const res = await exportPapiExcel(papiPicks, {
                    ...buildCandidateMeta(a.candidates, { finishedAt: a.finished_at }),
                  });
                  toast.success(
                    `Excel PAPI diunduh — ${res.answered}/${res.total} item terisi, skala tertinggi ${res.highest.join(", ") || "-"}`,
                  );
                } catch (e: any) {
                  toast.error(e?.message ?? "Gagal membuat file Excel");
                }
              }}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Ekspor Excel PAPI
            </Button>
          )}
          {isMsdt && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const res = await exportMsdtExcel(msdtPicks, {
                    ...buildCandidateMeta(a.candidates, { finishedAt: a.finished_at }),
                  });
                  toast.success(
                    `Excel MSDT diunduh — ${res.answered}/${res.total} item terisi, gaya dominan ${res.dominant}`,
                  );
                } catch (e: any) {
                  toast.error(e?.message ?? "Gagal membuat file Excel");
                }
              }}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Ekspor Excel MSDT
            </Button>
          )}
          {isRmib && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const res = await exportRmibExcel(rmibGroups, {
                    ...buildCandidateMeta(a.candidates, { finishedAt: a.finished_at }),
                  });
                  toast.success(
                    `Excel RMIB diunduh — ${res.answeredGroups}/${res.totalGroups} kelompok terisi`,
                  );
                } catch (e: any) {
                  toast.error(e?.message ?? "Gagal membuat file Excel");
                }
              }}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Ekspor Excel RMIB
            </Button>
          )}
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Cetak
          </Button>
        </div>
      </div>
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">Lembar Jawaban — {t?.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{a.candidates?.full_name}</span>
          <span className="font-mono">
            {a.candidates?.candidate_codes?.code ?? a.candidates?.code_snapshot ?? "-"}
          </span>
          <Badge variant="outline" className="uppercase">
            {t?.test_type}
          </Badge>
          <Badge
            className={a.status === "finished" ? "bg-success" : ""}
            variant={a.status === "finished" ? "default" : "secondary"}
          >
            {a.status === "finished" ? `Skor: ${a.score}` : "Belum selesai"}
          </Badge>
        </div>
      </div>

      {isPapi && papi && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Skor PAPI Kostick — {papi.answered}/90 terisi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {(
              [
                ["Skala Peran (Roles)", PAPI_TOP_ORDER],
                ["Skala Kebutuhan (Needs)", PAPI_BOTTOM_ORDER],
              ] as const
            ).map(([title, order]) => (
              <div key={title}>
                <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  {title}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {order.map((letter) => {
                    const v = papi.scales[letter] ?? 0;
                    return (
                      <div
                        key={letter}
                        className="flex items-center gap-3 rounded border bg-muted/30 px-3 py-2"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-primary text-xs font-bold text-primary-foreground">
                          {letter}
                        </span>
                        <span className="flex-1 truncate text-xs">{PAPI_SCALE_LABEL[letter]}</span>
                        <div className="h-2 w-20 overflow-hidden rounded bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(v / 9) * 100}%` }}
                          />
                        </div>
                        <b className="w-8 text-right text-xs">{v}/9</b>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Skala tertinggi: <b className="text-foreground">{papi.highest.join(", ") || "-"}</b>.
              Opsi A dihitung ke panah atas dan opsi B ke panah bawah sesuai lembar jawaban resmi
              PAPI.
            </p>
          </CardContent>
        </Card>
      )}

      {isMsdt && msdt && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>
              Skor MSDT — {msdt.answered}/{msdt.total} terisi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {MSDT_STYLE_COLUMNS.map((style) => {
                const c = msdt.columns[style];
                return (
                  <div
                    key={style}
                    className="flex items-center gap-3 rounded border bg-muted/30 px-3 py-2"
                  >
                    <span className="grid h-7 w-9 shrink-0 place-items-center rounded bg-primary text-xs font-bold text-primary-foreground">
                      {style}
                    </span>
                    <span className="flex-1 truncate text-xs">{MSDT_STYLE_LABEL[style]}</span>
                    <span className="text-xs text-muted-foreground">
                      A {c.A} · B {c.B} · K {c.koreksi}
                    </span>
                    <b className="w-8 text-right text-xs">{c.jumlah}</b>
                  </div>
                );
              })}
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              {(["TO", "RO", "E", "O"] as const).map((d) => (
                <div key={d} className="rounded border bg-muted/30 px-3 py-2 text-center">
                  <div className="text-xs text-muted-foreground">{d}</div>
                  <div className="text-lg font-bold">{msdt.dims[d]}</div>
                  <div className="text-xs text-muted-foreground">
                    konversi {msdt.konversi[d].toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Gaya dominan: <b className="text-foreground">{msdt.dominantLabel}</b>. Nilai ini sama
              dengan sheet “Otomatis Scoring” pada template Excel MSDT.
            </p>
          </CardContent>
        </Card>
      )}



      {isRmib && rmib && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>
              Hasil RMIB — {rmib.answeredGroups}/{rmib.totalGroups} kelompok terisi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {rmib.order.map((o) => (
                <div
                  key={o.category}
                  className="flex items-center gap-3 rounded border bg-muted/30 px-3 py-2"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-primary text-xs font-bold text-primary-foreground">
                    {o.rank}
                  </span>
                  <span className="flex-1 truncate text-xs">{o.label}</span>
                  <b className="w-10 text-right text-xs">{o.total}</b>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Total kecil = minat lebih tinggi (jumlah peringkat dari 9 kelompok). Tiga minat
              teratas:{" "}
              <b className="text-foreground">
                {rmib.order
                  .slice(0, 3)
                  .map((o) => o.label.split(" — ")[0])
                  .join(", ")}
              </b>
              .
            </p>
          </CardContent>
        </Card>
      )}

      {isPauli && (
        <PauliResult
          questions={data.questions as any[]}
          answerOf={(qid: string) => answerMap.get(qid)?.answer}
          meta={{
            ...buildCandidateMeta(a.candidates, { finishedAt: a.finished_at }),
          }}
        />
      )}

      {a.result && !isPapi && !isPauli && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Ringkasan Hasil</CardTitle>
          </CardHeader>
          <CardContent>
            {isDisc && a.result.most ? (
              <div>
                <div className="mb-2 text-sm">
                  Dominan: <b className="text-primary">{a.result.dominant}</b>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {(["D", "I", "S", "C"] as const).map((k) => (
                    <div key={k} className="rounded border bg-muted/40 p-2">
                      <div className="text-lg font-bold text-primary">{k}</div>
                      <div>
                        Most: <b>{a.result.most?.[k] ?? 0}</b>
                      </div>
                      <div>
                        Least: <b>{a.result.least?.[k] ?? 0}</b>
                      </div>
                      <div>
                        Change: <b>{a.result.change?.[k] ?? 0}</b>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
                {JSON.stringify(a.result, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {(isPauli ? [] : data.questions).map((q: any, i: number) => {
          const ans = answerMap.get(q.id);
          const opts: any[] = Array.isArray(q.options) ? q.options : [];
          let disc: { most?: string; least?: string } | null = null;
          if (isDisc && ans?.answer) {
            try {
              disc = JSON.parse(ans.answer);
            } catch {
              disc = null;
            }
          }
          const correct = !isDisc && q.correct_answer && ans?.answer === q.correct_answer;

          return (
            <Card key={q.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between text-xs uppercase text-muted-foreground">
                  <span>{isDisc ? `Kelompok ${i + 1}` : `Soal ${i + 1}`}</span>
                  {!isDisc && q.correct_answer && (
                    <Badge className={correct ? "bg-success" : "bg-destructive"}>
                      {correct ? "Benar" : "Salah"}
                    </Badge>
                  )}
                </div>
                {q.question_text && (
                  <div className="mb-2 text-sm font-medium">{q.question_text}</div>
                )}
                {isDisc ? (
                  <div className="overflow-hidden rounded-md border text-sm">
                    {opts.map((opt: any) => {
                      const isMost = disc?.most === opt.key;
                      const isLeast = disc?.least === opt.key;
                      return (
                        <div
                          key={opt.key}
                          className="grid grid-cols-[1fr_64px_64px] items-center border-t first:border-t-0"
                        >
                          <div className="px-3 py-2">
                            {opt.label}{" "}
                            <span className="text-xs text-muted-foreground">({opt.dimension})</span>
                          </div>
                          <div
                            className={`border-l py-2 text-center ${isMost ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"}`}
                          >
                            {isMost ? "M" : "·"}
                          </div>
                          <div
                            className={`border-l py-2 text-center ${isLeast ? "bg-destructive text-destructive-foreground font-bold" : "text-muted-foreground"}`}
                          >
                            {isLeast ? "L" : "·"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1 text-sm">
                    {opts.map((opt: any) => {
                      const picked = ans?.answer === opt.key;
                      const isKey = q.correct_answer === opt.key;
                      return (
                        <div
                          key={opt.key}
                          className={`flex items-center gap-2 rounded border p-2 ${isKey ? "border-success bg-success/10" : ""} ${picked && !isKey ? "border-destructive bg-destructive/10" : ""}`}
                        >
                          <span className="font-mono">{opt.key}.</span>
                          <span className="flex-1">{opt.label}</span>
                          {picked && <Badge variant="outline">Jawaban</Badge>}
                          {isKey && <Badge className="bg-success">Kunci</Badge>}
                        </div>
                      );
                    })}
                    {!ans && (
                      <div className="text-xs italic text-muted-foreground">Tidak dijawab</div>
                    )}
                    {ans && !opts.some((o: any) => o.key === ans.answer) && (
                      <div className="rounded border bg-muted/40 p-2 text-xs">
                        Jawaban: <b>{ans.answer}</b>
                      </div>
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
