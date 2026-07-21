import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAttemptDetail } from "@/lib/admin.functions";
import { AttemptView } from "@/components/attempt-view";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/attempts/$attemptId")({ component: AttemptDetailPage });

function AttemptDetailPage() {
  const { attemptId } = Route.useParams();
  const fn = useServerFn(getAttemptDetail);
  const { data } = useQuery({ queryKey: ["attempt", attemptId], queryFn: () => fn({ data: { attempt_id: attemptId } }) });

  if (!data) return <div className="text-muted-foreground">Memuat...</div>;
  const cand = (data.attempt as any)?.candidates;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/candidates/$id" params={{ id: cand?.id ?? "" }}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Kandidat</Link>
      </Button>
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">Detail Lembar Jawaban</h1>
        <p className="text-sm text-muted-foreground">
          Kandidat: <b>{cand?.full_name ?? "-"}</b> · Kode: <span className="font-mono">{cand?.candidate_codes?.code ?? "-"}</span>
        </p>
      </div>
      <AttemptView attempt={data.attempt} questions={data.questions as any} answers={data.answers as any} showCorrect />
    </div>
  );
}
