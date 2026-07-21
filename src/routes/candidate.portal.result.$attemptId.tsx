import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { candidateGetAttemptResult } from "@/lib/candidate.functions";
import { useCandidateSession } from "@/lib/candidate-session";
import { AttemptView } from "@/components/attempt-view";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/candidate/portal/result/$attemptId")({ component: CandidateResultPage });

function CandidateResultPage() {
  const { attemptId } = Route.useParams();
  const session = useCandidateSession();
  const fn = useServerFn(candidateGetAttemptResult);
  const { data } = useQuery({
    queryKey: ["candidate-result", attemptId, session?.code],
    queryFn: () => fn({ data: { code: session!.code, attempt_id: attemptId } }),
    enabled: !!session,
  });

  if (!data) return <div className="text-muted-foreground">Memuat...</div>;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/candidate/portal/tests"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Test</Link>
      </Button>
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">Hasil & Lembar Jawaban Anda</h1>
        <p className="text-sm text-muted-foreground">Tinjau soal, jawaban Anda, dan hasil skoring.</p>
      </div>
      <AttemptView attempt={data.attempt} questions={data.questions as any} answers={data.answers as any} showCorrect />
    </div>
  );
}
