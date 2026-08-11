import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { candidateGetProfile } from "@/lib/candidate.functions";
import { useCandidateSession } from "@/lib/candidate-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, User, ClipboardList, ArrowRight, Info } from "lucide-react";

export const Route = createFileRoute("/candidate/portal/")({
  head: () => ({ meta: [
    { title: "Beranda Portal Kandidat — Dover Chemical" },
    { name: "description", content: "Ringkasan tahapan seleksi kandidat PT Dover Chemical: kelengkapan data diri dan progres psikotest." },
    { property: "og:title", content: "Beranda Portal Kandidat — Dover Chemical" },
    { property: "og:description", content: "Ringkasan tahapan seleksi kandidat PT Dover Chemical: kelengkapan data diri dan progres psikotest." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: PortalHome,
});

function PortalHome() {
  const session = useCandidateSession();
  const getProfile = useServerFn(candidateGetProfile);
  const { data, isLoading } = useQuery({
    queryKey: ["candidate-profile", session?.code],
    queryFn: () => getProfile({ data: { code: session!.code, device: session!.device } }),
    enabled: !!session,
  });

  if (!session) return null;
  if (isLoading) return <div className="text-muted-foreground">Memuat...</div>;

  const dataDone = data?.candidate?.data_completed;
  const totalTests = data?.tests?.length ?? 0;
  const finishedTests = (data?.attempts ?? []).filter((a: any) => a.status === "finished").length;
  const testsDone = totalTests > 0 && finishedTests === totalTests;

  const steps = [dataDone, testsDone];
  const progress = Math.round((steps.filter(Boolean).length / steps.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">Halo, {data?.candidate?.full_name ?? session.candidate_name}</h1>
        <p className="text-muted-foreground">Ikuti tahapan berikut untuk menyelesaikan proses seleksi Anda.</p>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle>Progress Keseluruhan</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-primary">{progress}%</span>
            <span className="text-sm text-muted-foreground">{steps.filter(Boolean).length} / {steps.length} tahap selesai</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <StepCard title="Data Diri" desc="Isi biodata lengkap Anda." icon={User} done={!!dataDone} to="/candidate/portal/data" />
        <StepCard title="Psikotest" desc={`${finishedTests}/${totalTests} test selesai`} icon={ClipboardList} done={testsDone} to="/candidate/portal/tests" />
      </div>


      {(data?.attempts?.length ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle>Hasil Psikotest</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[...data!.attempts]
              .sort(
                (x: any, y: any) =>
                  data!.tests.findIndex((t: any) => t.id === x.test_id) -
                  data!.tests.findIndex((t: any) => t.id === y.test_id),
              )
              .map((a: any) => {
              const testIdx = data!.tests.findIndex((t: any) => t.id === a.test_id);
              return (
                <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">{testIdx >= 0 ? `TEST ${testIdx + 1}` : "TEST"}</div>
                    <div className="text-xs text-muted-foreground">{a.status === "finished" ? "Selesai" : "Sedang berlangsung"}</div>
                  </div>
                  <Badge variant={a.status === "finished" ? "default" : "secondary"}>
                    {a.status === "finished" ? "Selesai" : "In progress"}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepCard({ title, desc, icon: Icon, done, to }: any) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <Icon className="h-6 w-6 text-primary-glow" />
          {done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="font-semibold text-primary">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
        <Button asChild size="sm" variant={done ? "outline" : "default"} className="mt-4 w-full">
          <Link to={to}>{done ? "Lihat" : "Mulai"} <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}
