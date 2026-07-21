import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTests } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Timer, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/admin/tests")({ component: TestsListPage });

function TestsListPage() {
  const fn = useServerFn(listTests);
  const { data } = useQuery({ queryKey: ["admin-tests"], queryFn: () => fn({ data: {} as never }) });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">Bank Soal Psikotest</h1>
        <p className="text-muted-foreground">Lihat seluruh test beserta soal & kunci jawabannya.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(data?.tests ?? []).map((t: any) => (
          <Card key={t.id} className="shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-hero text-primary-foreground">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <div className="mt-1 text-xs uppercase text-muted-foreground">{t.test_type}</div>
                  </div>
                </div>
                <Badge variant={t.active ? "default" : "secondary"}>{t.active ? "Aktif" : "Nonaktif"}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t.description}</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> {t.duration_minutes} menit</span>
                <span>{(t.test_questions ?? []).length} soal</span>
              </div>
              <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                <Link to="/admin/tests/$testId" params={{ testId: t.id }}>Lihat Soal <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {(data?.tests ?? []).length === 0 && (
          <div className="col-span-full text-center text-sm text-muted-foreground">Belum ada test.</div>
        )}
      </div>
    </div>
  );
}
