import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

type Q = {
  id: string;
  question_number: number;
  question_text: string;
  options: any;
  correct_answer?: string | null;
  dimension?: string | null;
};
type A = { question_id: string; answer: string };

export function AttemptView({
  attempt,
  questions,
  answers,
  showCorrect = true,
}: {
  attempt: any;
  questions: Q[];
  answers: A[];
  showCorrect?: boolean;
}) {
  const test = attempt?.tests;
  const type = test?.test_type as string;
  const answerMap = new Map(answers.map((a) => [a.question_id, a.answer]));

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{test?.name}</CardTitle>
              <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                {test?.test_type} · {questions.length} soal
              </p>
            </div>
            <div className="flex items-center gap-2">
              {attempt?.status === "finished" ? (
                <Badge className="bg-success">Selesai — Skor {attempt.score}</Badge>
              ) : (
                <Badge variant="secondary">{attempt?.status}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {attempt?.result && type === "disc" && attempt.result.most ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Profil DISC — Dominan: <span className="text-primary">{attempt.result.dominant}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {(["D", "I", "S", "C"] as const).map((k) => (
                  <div key={k} className="rounded border bg-muted/40 p-2">
                    <div className="text-lg font-bold text-primary">{k}</div>
                    <div>Most: <b>{attempt.result.most?.[k] ?? 0}</b></div>
                    <div>Least: <b>{attempt.result.least?.[k] ?? 0}</b></div>
                    <div>Change: <b>{attempt.result.change?.[k] ?? 0}</b></div>
                  </div>
                ))}
              </div>
            </div>
          ) : attempt?.result ? (
            <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{JSON.stringify(attempt.result, null, 2)}</pre>
          ) : (
            <div className="text-sm text-muted-foreground">Belum ada hasil.</div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle>Soal & Lembar Jawaban</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {questions.map((q) => {
            const raw = answerMap.get(q.id);
            return (
              <div key={q.id} className="rounded-md border p-4">
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded bg-primary/10 px-2 py-0.5 font-semibold text-primary">No. {q.question_number}</span>
                  {q.dimension ? <span className="uppercase">Dimensi: {q.dimension}</span> : null}
                </div>
                <div className="whitespace-pre-wrap text-sm font-medium">{q.question_text}</div>

                {type === "disc" ? (
                  <DiscAnswer q={q} raw={raw} />
                ) : type === "mcq" || type === "kraepelin" ? (
                  <McqAnswer q={q} raw={raw} showCorrect={showCorrect} />
                ) : (
                  <div className="mt-3 text-xs">
                    <span className="text-muted-foreground">Jawaban: </span>
                    <span className="font-mono">{raw ?? "-"}</span>
                  </div>
                )}
              </div>
            );
          })}
          {questions.length === 0 && <div className="text-sm text-muted-foreground">Tidak ada soal.</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function McqAnswer({ q, raw, showCorrect }: { q: Q; raw?: string; showCorrect: boolean }) {
  const opts: any[] = Array.isArray(q.options) ? q.options : [];
  return (
    <div className="mt-3 space-y-1.5">
      {opts.map((o, i) => {
        const value = typeof o === "string" ? o : (o.value ?? o.key ?? String.fromCharCode(65 + i));
        const label = typeof o === "string" ? o : (o.label ?? o.text ?? value);
        const isPicked = raw === value;
        const isCorrect = showCorrect && q.correct_answer === value;
        return (
          <div
            key={i}
            className={`flex items-start gap-2 rounded border p-2 text-sm ${
              isCorrect ? "border-success/50 bg-success/10" : ""
            } ${isPicked && !isCorrect ? "border-destructive/50 bg-destructive/10" : ""} ${
              isPicked && isCorrect ? "border-success bg-success/20" : ""
            }`}
          >
            <span className="mt-0.5 font-mono text-xs">{value}.</span>
            <span className="flex-1">{label}</span>
            {isPicked && (isCorrect ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />)}
            {!isPicked && isCorrect && <Badge variant="outline" className="text-[10px]">Kunci</Badge>}
          </div>
        );
      })}
      {!raw && <div className="text-xs text-muted-foreground">Belum dijawab.</div>}
    </div>
  );
}

function DiscAnswer({ q, raw }: { q: Q; raw?: string }) {
  const opts: any[] = Array.isArray(q.options) ? q.options : [];
  let parsed: { most?: string; least?: string } = {};
  try { if (raw) parsed = JSON.parse(raw); } catch { /* noop */ }
  return (
    <div className="mt-3 space-y-1.5">
      {opts.map((o, i) => {
        const key = o.key ?? o.value ?? String.fromCharCode(65 + i);
        const label = o.label ?? o.text ?? key;
        const dim = o.dimension ?? o.dim ?? "";
        const isMost = parsed.most === key;
        const isLeast = parsed.least === key;
        return (
          <div key={i} className="flex items-center gap-2 rounded border p-2 text-sm">
            <span className="font-mono text-xs text-muted-foreground">{key}</span>
            <span className="flex-1">{label}</span>
            {dim && <Badge variant="outline" className="text-[10px]">{dim}</Badge>}
            {isMost && <Badge className="bg-primary text-primary-foreground text-[10px]">MOST</Badge>}
            {isLeast && <Badge className="bg-secondary text-[10px]">LEAST</Badge>}
          </div>
        );
      })}
      {!raw && <div className="text-xs text-muted-foreground">Belum dijawab.</div>}
    </div>
  );
}
