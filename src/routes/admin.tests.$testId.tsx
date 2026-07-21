import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTestDetail } from "@/lib/admin.functions";
import { AttemptView } from "@/components/attempt-view";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/tests/$testId")({ component: TestBankDetail });

function TestBankDetail() {
  const { testId } = Route.useParams();
  const fn = useServerFn(getTestDetail);
  const { data } = useQuery({ queryKey: ["admin-test", testId], queryFn: () => fn({ data: { test_id: testId } }) });

  if (!data) return <div className="text-muted-foreground">Memuat...</div>;

  // Reuse AttemptView with an empty attempt so it renders "Soal & Lembar Jawaban" section as a bank preview.
  const fakeAttempt = { tests: data.test, status: "preview", score: null, result: null };
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/tests"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Link>
      </Button>
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">Bank Soal — {(data.test as any)?.name}</h1>
        <p className="text-sm text-muted-foreground">Preview soal beserta kunci jawaban.</p>
      </div>
      <AttemptView attempt={fakeAttempt} questions={data.questions as any} answers={[]} showCorrect />
    </div>
  );
}
