import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTests } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, ArrowRight, Timer } from "lucide-react";

export const Route = createFileRoute("/admin/tests/")({ component: TestsList });

function TestsList() {
  const fn = useServerFn(listTests);
  const { data, isLoading } = useQuery({ queryKey: ["admin-tests"], queryFn: () => fn({ data: {} as never }) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">Bank Soal Psikotest</h1>
        <p className="text-sm text-muted-foreground">Lihat seluruh soal, kunci jawaban, dan dimensi test.</p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Memuat...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(data?.tests ?? []).map((t: any) => (
            <Card key={t.id} className="shadow-card">
              <CardContent className="p-6">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-hero text-primary-foreground">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <Badge variant={t.active ? "default" : "secondary"}>{t.active ? "Aktif" : "Nonaktif"}</Badge>
                </div>
                <h3 className="font-display text-lg font-bold text-primary">{t.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="uppercase">{t.test_type}</span>
                  <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> {t.duration_minutes} menit</span>
                  <span>{t.question_count} soal</span>
                </div>
                <Button asChild className="mt-5 w-full">
                  <Link to="/admin/tests/$id" params={{ id: t.id }}>
                    {t.test_type === "mbti" ? "Kelola Soal MBTI" : "Lihat Soal"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
