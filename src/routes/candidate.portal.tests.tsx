import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { candidateGetProfile } from "@/lib/candidate.functions";
import { useCandidateSession } from "@/lib/candidate-session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Timer, ArrowRight, CheckCircle2, Lock, RotateCcw } from "lucide-react";

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
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">Psikotest</h1>
        <p className="text-sm text-muted-foreground">Kerjakan seluruh test yang tersedia. Anda dapat mengerjakan satu per satu.</p>
      </div>

      {!data?.candidate?.data_completed && (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="py-4 text-sm">Lengkapi <b>Data Diri</b> terlebih dahulu sebelum mengerjakan test.</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(data?.tests ?? []).map((t: any) => {
          const attempt = attempts.get(t.id) as any;
          const acc = access.get(t.id) as any;
          const closed = acc?.is_open === false;
          const retake = !!acc?.retake_count && attempt?.status !== "finished";
          const done = attempt?.status === "finished";
          return (
            <Card key={t.id} className="shadow-card">
              <CardContent className="p-6">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-hero text-primary-foreground">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  {closed ? (
                    <Badge variant="destructive"><Lock className="mr-1 h-3 w-3" /> Ditutup</Badge>
                  ) : done ? (
                    <Badge className="bg-success">Selesai</Badge>
                  ) : retake ? (
                    <Badge className="bg-warning text-warning-foreground"><RotateCcw className="mr-1 h-3 w-3" /> Ulangi test</Badge>
                  ) : (
                    <Badge variant="secondary">Belum dikerjakan</Badge>
                  )}
                </div>
                <h2 className="font-display text-lg font-bold text-primary">{t.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> {t.duration_minutes} menit</span>
                  <span className="uppercase">{t.test_type}</span>
                </div>
                {closed ? (
                  <div className="mt-5 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-center text-xs text-destructive">
                    <Lock className="mr-1 inline h-3.5 w-3.5" />
                    Akses test ini ditutup oleh admin{acc?.reason ? `: ${acc.reason}` : "."}
                  </div>
                ) : done ? (
                  <div className="mt-5 rounded-md border bg-muted/40 p-3 text-center text-xs text-muted-foreground">
                    <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-success" />
                    Jawaban Anda telah tersimpan. Hasil penilaian hanya dapat dilihat oleh tim HR &amp; Admin.
                  </div>
                ) : (
                  <Button
                    className="mt-5 w-full"
                    disabled={!data?.candidate?.data_completed}
                    onClick={() => nav({ to: "/candidate/portal/test/$testId", params: { testId: t.id } })}
                  >
                    {retake ? "Ulangi Test" : "Mulai Test"} <ArrowRight className="ml-2 h-4 w-4" />
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
