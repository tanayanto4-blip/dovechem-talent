import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { candidateStartTest, candidateSubmitTest } from "@/lib/candidate.functions";
import { useCandidateSession } from "@/lib/candidate-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Timer } from "lucide-react";

export const Route = createFileRoute("/candidate/portal/test/$testId")({ component: TakeTest });

function TakeTest() {
  const { testId } = Route.useParams();
  const session = useCandidateSession();
  const nav = useNavigate();
  const qc = useQueryClient();
  const start = useServerFn(candidateStartTest);
  const submit = useServerFn(candidateSubmitTest);

  const { data, isLoading } = useQuery({
    queryKey: ["start-test", testId, session?.code],
    queryFn: () => start({ data: { code: session!.code, test_id: testId } }),
    enabled: !!session,
    staleTime: Infinity,
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [discPicks, setDiscPicks] = useState<Record<string, { most?: string; least?: string }>>({});
  const [remaining, setRemaining] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!data?.test || !data?.attempt) return;
    const dur = data.test.duration_minutes * 60;
    const started = new Date(data.attempt.started_at).getTime();
    const left = Math.max(0, Math.floor((started + dur * 1000 - Date.now()) / 1000));
    setRemaining(left);
  }, [data]);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  useEffect(() => {
    if (data && remaining === 0 && !submitting && Object.keys(answers).length > 0) {
      handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  async function handleSubmit(auto = false) {
    if (!data) return;
    if (!auto && !confirm("Kirim jawaban? Anda tidak dapat mengubah setelah dikirim.")) return;
    setSubmitting(true);
    try {
      const payload = Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }));
      const res = await submit({ data: { code: session!.code, attempt_id: data.attempt.id, answers: payload } });
      toast.success(`Test selesai. Skor: ${res.score}`);
      qc.invalidateQueries({ queryKey: ["candidate-profile"] });
      nav({ to: "/candidate/portal/tests" });
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  }

  if (isLoading || !data || !data.test) return <div className="text-muted-foreground">Memuat test...</div>;
  if (data.attempt.status === "finished") {
    return <Card><CardContent className="py-8 text-center">Test sudah selesai. Skor: <b>{data.attempt.score}</b></CardContent></Card>;
  }

  const mins = Math.floor(remaining / 60).toString().padStart(2, "0");
  const secs = (remaining % 60).toString().padStart(2, "0");
  const answered = Object.keys(answers).length;
  const total = data.questions.length;
  const isKraepelin = data.test.test_type === "kraepelin";

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="font-display text-2xl text-primary">{data.test.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{data.test.description}</p>
            </div>
            <div className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">
              <div className="flex items-center gap-2"><Timer className="h-4 w-4" /> <span className="font-mono text-lg">{mins}:{secs}</span></div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{answered}/{total} soal</span></div>
            <Progress value={(answered / total) * 100} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {data.questions.map((q: any, i: number) => (
          <Card key={q.id} className="shadow-card">
            <CardContent className="p-6">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-secondary">Soal {i + 1}</div>
              <div className="text-base font-medium">{q.question_text}</div>
              {isKraepelin ? (
                <div className="mt-4 max-w-xs">
                  <Label className="text-xs text-muted-foreground">Jawaban Anda</Label>
                  <Input inputMode="numeric" value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} className="mt-1" />
                </div>
              ) : (
                <RadioGroup className="mt-4 space-y-2" value={answers[q.id] ?? ""} onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}>
                  {(q.options ?? []).map((opt: any) => (
                    <label key={opt.key} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent">
                      <RadioGroupItem value={opt.key} id={`${q.id}-${opt.key}`} />
                      <span className="text-sm"><b className="mr-2">{opt.key}.</b>{opt.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" onClick={() => handleSubmit(false)} disabled={submitting || answered === 0}>
          {submitting ? "Mengirim..." : `Kirim Jawaban (${answered}/${total})`}
        </Button>
      </div>
    </div>
  );
}
