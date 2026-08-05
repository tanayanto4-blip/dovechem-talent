import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTestWithQuestions } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MbtiAdmin } from "@/components/mbti-admin";
import { TestDurationEditor } from "@/components/test-duration-editor";
import { TestPublishToggle, QuestionPublishToggle, BulkQuestionPublish } from "@/components/publish-toggle";
import { QuestionEditorDialog, QuestionDeleteButton, TestMetaEditor } from "@/components/question-editor";


export const Route = createFileRoute("/admin/tests/$id")({ component: TestDetail });

function TestDetail() {
  const { id } = Route.useParams();
  const fn = useServerFn(getTestWithQuestions);
  const { data, isLoading } = useQuery({ queryKey: ["admin-test", id], queryFn: () => fn({ data: { id } }) });

  if (isLoading || !data) return <div className="text-muted-foreground">Memuat...</div>;
  const t = data.test as any;
  if (t.test_type === "mbti") {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm"><Link to="/admin/tests"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Bank Soal</Link></Button>
        <div className="grid max-w-2xl gap-3 md:grid-cols-2">
          <TestPublishToggle testId={t.id} testName={t.name} active={!!t.active} />
          <TestDurationEditor testId={t.id} testName={t.name} value={t.duration_minutes} />
        </div>
        <MbtiAdmin initialTestId={id} />
      </div>
    );
  }
  const isDisc = t.test_type === "disc";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to="/admin/tests"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Link></Button>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-3xl font-bold text-primary">{t.name}</h1>
          <Badge variant="outline" className="uppercase">{t.test_type}</Badge>
          <Badge variant="secondary">{t.duration_minutes} menit</Badge>
          <Badge>{data.questions.length} soal</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
        <div className="mt-4 grid max-w-2xl gap-3 md:grid-cols-2">

          <TestPublishToggle testId={t.id} testName={t.name} active={!!t.active} />
          <TestDurationEditor testId={t.id} testName={t.name} value={t.duration_minutes} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <BulkQuestionPublish testId={t.id} />
          <TestMetaEditor testId={t.id} name={t.name} description={t.description} />
          <QuestionEditorDialog
            testId={t.id}
            nextNumber={
              (data.questions as any[]).reduce((m, q) => Math.max(m, q.question_number ?? 0), 0) + 1
            }
          />
        </div>
      </div>


      <div className="space-y-4">
        {data.questions.map((q: any, i: number) => (
          <Card key={q.id} className={`shadow-card ${q.active === false ? "opacity-60" : ""}`}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm text-muted-foreground">
                  {isDisc ? `Kelompok ${i + 1}` : `Soal ${q.question_number ?? i + 1}`}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  {q.dimension && <Badge variant="outline">Dim: {q.dimension}</Badge>}
                  <QuestionPublishToggle id={q.id} active={q.active !== false} />
                  <QuestionEditorDialog testId={t.id} question={q} />
                  <QuestionDeleteButton id={q.id} number={q.question_number ?? i + 1} />
                </div>
              </div>

            </CardHeader>
            <CardContent>
              {q.question_text && <div className="mb-3 font-medium">{q.question_text}</div>}
              {Array.isArray(q.options) && q.options.length > 0 ? (
                isDisc ? (
                  <div className="overflow-hidden rounded-md border">
                    <div className="grid grid-cols-[56px_1fr_80px] bg-muted/60 text-xs font-semibold uppercase text-muted-foreground">
                      <div className="px-3 py-2">Key</div>
                      <div className="px-3 py-2 border-l">Pernyataan</div>
                      <div className="px-3 py-2 border-l">Dimensi</div>
                    </div>
                    {q.options.map((opt: any) => (
                      <div key={opt.key} className="grid grid-cols-[56px_1fr_80px] items-center border-t text-sm">
                        <div className="px-3 py-2 font-mono">{opt.key}</div>
                        <div className="px-3 py-2 border-l">{opt.label}</div>
                        <div className="px-3 py-2 border-l"><Badge variant="secondary">{opt.dimension ?? "-"}</Badge></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {q.options.map((opt: any) => {
                      const correct = q.correct_answer && opt.key === q.correct_answer;
                      return (
                        <div key={opt.key} className={`flex items-center gap-3 rounded-md border p-2 text-sm ${correct ? "border-success bg-success/10" : ""}`}>
                          <span className="font-mono font-bold">{opt.key}.</span>
                          <span className="flex-1">{opt.label}</span>
                          {correct && <Badge className="bg-success">Kunci</Badge>}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : q.options && typeof q.options === "object" && typeof (q.options as any).digits === "string" ? (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Deret angka kolom ini ({(q.options as any).digits.length} digit) — kandidat menjumlahkan dua angka bersebelahan.
                  </div>
                  <div className="max-h-32 overflow-auto rounded-md border bg-muted/40 p-2 font-mono text-xs leading-relaxed break-all">
                    {(q.options as any).digits}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  Soal isian bebas — kandidat mengetik jawaban sendiri.
                  {q.correct_answer ? <> Kunci: <span className="font-mono font-semibold">{q.correct_answer}</span></> : null}
                </div>
              )}

              {q.explanation && (
                <div className="mt-3 rounded bg-muted p-2 text-xs text-muted-foreground"><b>Penjelasan:</b> {q.explanation}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
