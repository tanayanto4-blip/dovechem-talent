import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { candidateGetProfile } from "@/lib/candidate.functions";
import { useCandidateSession } from "@/lib/candidate-session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Lock, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/candidate/portal/tests")({ component: TestsPage });

function TestsPage() {
  const session = useCandidateSession();
  const nav = useNavigate();
  const getProfile = useServerFn(candidateGetProfile);
  const { data } = useQuery({
    queryKey: ["candidate-profile", session?.code],
    queryFn: () => getProfile({ data: { code: session!.code } }),
    enabled: !!session,
  });
  const attempts = new Map((data?.attempts ?? []).map((a: any) => [a.test_id, a]));
  const access = new Map(((data as any)?.access ?? []).map((a: any) => [a.test_id, a]));

  return (
    <div className="space-y-6">
      {!data?.candidate?.data_completed && (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="py-4 text-sm">Lengkapi <b>Data Diri</b> terlebih dahulu sebelum mengerjakan test.</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(data?.tests ?? []).map((t: any, idx: number) => {
          const attempt = attempts.get(t.id) as any;
          const acc = access.get(t.id) as any;
          const closed = acc?.is_open === false;
          const retake = !!acc?.retake_count && attempt?.status !== "finished";
          const done = attempt?.status === "finished";
          return (
            <Card key={t.id} className="shadow-card">
              <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl font-bold text-primary">TEST {idx + 1}</h2>
                  {closed ? (
                    <Badge variant="destructive"><Lock className="mr-1 h-3 w-3" /> Ditutup</Badge>
                  ) : done ? (
                    <Badge className="bg-success">Selesai</Badge>
                  ) : retake ? (
                    <Badge className="bg-warning text-warning-foreground"><RotateCcw className="mr-1 h-3 w-3" /> Ulangi</Badge>
                  ) : (
                    <Badge variant="secondary">Belum</Badge>
                  )}
                </div>
                {closed ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-center text-xs text-destructive">
                    <Lock className="mr-1 inline h-3.5 w-3.5" />
                    Test ditutup
                  </div>
                ) : done ? (
                  <div className="rounded-md border border-success/40 bg-success/10 p-3 text-center text-xs font-semibold text-success">
                    <Lock className="mr-1 inline h-3.5 w-3.5" />
                    TEST SUDAH SELESAI DAN TERKUNCI
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    disabled={!data?.candidate?.data_completed}
                    onClick={() => nav({ to: "/candidate/portal/test/$testId", params: { testId: t.id } })}
                  >
                    {retake ? "Ulangi" : "Mulai"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
