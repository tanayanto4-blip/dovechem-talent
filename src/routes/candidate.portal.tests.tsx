import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { candidateGetProfile } from "@/lib/candidate.functions";
import { useCandidateSession } from "@/lib/candidate-session";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="grid gap-4 md:grid-cols-2">
      {(data?.tests ?? []).map((t: any, idx: number) => {
        const attempt = attempts.get(t.id) as any;
        const acc = access.get(t.id) as any;
        const closed = acc?.is_open === false;
        const done = attempt?.status === "finished";
        const locked = closed || done;
        const available = !locked && !!data?.candidate?.data_completed;
        return (
          <Card
            key={t.id}
            className={`shadow-card ${available ? "cursor-pointer hover:ring-2 hover:ring-primary/40" : ""}`}
            onClick={() => {
              if (available) nav({ to: "/candidate/portal/test/$testId", params: { testId: t.id } });
            }}
          >
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <h2 className="font-display text-2xl font-bold text-primary">TEST {idx + 1}</h2>
              {locked && (
                <p className="mt-2 text-sm font-semibold text-destructive">TEST SUDAH SELESAI DAN TERKUNCI</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
