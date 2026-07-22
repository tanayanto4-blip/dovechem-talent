import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTestWithQuestions } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MbtiAdmin } from "./admin.mbti";

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
      </div>

      <div className="space-y-4">
        {data.questions.map((q: any, i: number) => (
          <Card key={q.id} className="shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-muted-foreground">
                  {isDisc ? `Kelompok ${i + 1}` : `Soal ${i + 1}`}
                </CardTitle>
                {q.dimension && <Badge variant="outline">Dim: {q.dimension}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              {q.question_text && <div className="mb-3 font-medium">{q.question_text}</div>}
              {isDisc ? (
                <div className="overflow-hidden rounded-md border">
                  <div className="grid grid-cols-[56px_1fr_80px] bg-muted/60 text-xs font-semibold uppercase text-muted-foreground">
                    <div className="px-3 py-2">Key</div>
                    <div className="px-3 py-2 border-l">Pernyataan</div>
                    <div className="px-3 py-2 border-l">Dimensi</div>
                  </div>
                  {(q.options ?? []).map((opt: any) => (
                    <div key={opt.key} className="grid grid-cols-[56px_1fr_80px] items-center border-t text-sm">
                      <div className="px-3 py-2 font-mono">{opt.key}</div>
                      <div className="px-3 py-2 border-l">{opt.label}</div>
                      <div className="px-3 py-2 border-l"><Badge variant="secondary">{opt.dimension ?? "-"}</Badge></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(q.options ?? []).map((opt: any) => {
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
