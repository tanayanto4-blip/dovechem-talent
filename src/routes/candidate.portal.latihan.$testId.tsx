import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { candidateGetTestIntro, candidateGetProfile } from "@/lib/candidate.functions";
import { testDisplayName } from "@/lib/test-display-name";
import { useCandidateSession } from "@/lib/candidate-session";
import { practiceSampleFor } from "@/lib/practice-samples";
import { TestQuestionCard } from "@/components/test-question-card";
import { PauliSheet, pauliFilledCount } from "@/components/pauli-sheet";
import { WptSheet } from "@/components/wpt-sheet";
import { RmibSheet } from "@/components/rmib-sheet";
import { rmibGroupComplete } from "@/lib/rmib-key";
import { ISHIHARA_PLATES } from "@/lib/ishihara-plates";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Lightbulb, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/candidate/portal/latihan/$testId")({
  head: () => ({
    meta: [
      { title: "Halaman Latihan Soal — Portal Kandidat Dover Chemical" },
      {
        name: "description",
        content:
          "Halaman latihan berisi petunjuk pengerjaan dan satu contoh soal sebelum kandidat masuk ke halaman test yang sebenarnya.",
      },
      { property: "og:title", content: "Halaman Latihan Soal — Portal Kandidat Dover Chemical" },
      {
        property: "og:description",
        content: "Petunjuk pengerjaan dan satu contoh soal latihan sebelum psikotest dimulai.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PracticePage,
});

function PracticePage() {
  const { testId } = Route.useParams();
  const session = useCandidateSession();
  const nav = useNavigate();
  const getIntro = useServerFn(candidateGetTestIntro);
  const getProfile = useServerFn(candidateGetProfile);

  const profileQ = useQuery({
    queryKey: ["candidate-profile", session?.code],
    queryFn: () => getProfile({ data: { code: session!.code, device: session!.device } }),
    enabled: !!session,
  });
  const testMeta = ((profileQ.data?.tests ?? []) as any[]).find((t: any) => t.id === testId);
  const testLabel = testDisplayName(testMeta);

  const intro = useQuery({
    queryKey: ["test-intro", testId, session?.code],
    queryFn: () =>
      getIntro({ data: { code: session!.code, device: session!.device, test_id: testId } }),
    enabled: !!session,
    staleTime: Infinity,
  });

  const sample = practiceSampleFor((intro.data?.test as any)?.test_type);
  const q = sample.question;
  const [answer, setAnswer] = useState("");
  const [disc, setDisc] = useState<{ most?: string; least?: string }>({});

  const isPauli = sample.testType === "pauli";
  const isWpt = sample.testType === "wpt";
  const isDisc = sample.testType === "disc";
  const isRmib = sample.testType === "rmib";

  const tried = isDisc
    ? !!(disc.most && disc.least && disc.most !== disc.least)
    : isRmib
      ? rmibGroupComplete(answer)
      : isPauli
      ? pauliFilledCount(answer) > 0
      : answer.trim() !== "";

  if (!session) {
    return (
      <Card>
        <CardContent className="space-y-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Sesi kandidat tidak ditemukan. Silakan login kembali menggunakan kode akses Anda.
          </p>
          <Button onClick={() => nav({ to: "/candidate/login" })}>Login Kandidat</Button>
        </CardContent>
      </Card>
    );
  }

  if (intro.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat halaman latihan...
        </CardContent>
      </Card>
    );
  }

  function setDiscPick(_qid: string, kind: "most" | "least", key: string) {
    setDisc((prev) => {
      const cur = { ...prev };
      if (cur[kind] === key) delete cur[kind];
      else {
        cur[kind] = key;
        const other = kind === "most" ? "least" : "most";
        if (cur[other] === key) delete cur[other];
      }
      return cur;
    });
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <h1 className="font-display text-2xl font-semibold leading-none tracking-tight text-primary">
            LATIHAN — {testLabel}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Halaman ini terpisah dari halaman test. Waktu belum berjalan dan jawaban di sini tidak
            dinilai.
          </p>
        </CardHeader>
      </Card>

      <Card className="border-primary/30 bg-primary/5 shadow-card">
        <CardContent className="space-y-2 p-6 text-sm">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Lightbulb className="h-4 w-4" /> Petunjuk Pengerjaan
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            {sample.instructions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Contoh Soal &amp; Lembar Jawaban
        </div>

        {isPauli ? (
          <PauliSheet
            questions={[q as any]}
            answers={{ [q.id]: answer }}
            onChange={(_qid, value) => setAnswer(value)}
            showGuide
          />
        ) : isRmib ? (
          <RmibSheet
            questions={[q as any]}
            answers={{ [q.id]: answer }}
            gender={(profileQ.data as any)?.candidate?.gender}
            onChange={(_qid, value) => setAnswer(value)}
          />
        ) : isWpt ? (
          <WptSheet
            questions={[q as any]}
            answers={{ [q.id]: answer }}
            images={{}}
            onChange={(_qid, value) => setAnswer(value)}
          />
        ) : (
          <TestQuestionCard
            q={q as any}
            index={0}
            total={1}
            testType={sample.testType as any}
            answer={answer}
            discPick={disc}
            wptImage={sample.testType === "ishihara" ? ISHIHARA_PLATES[1] : null}
            onPickMcq={(_qid, key) => setAnswer(key)}
            onSetDisc={setDiscPick}
            onChangeText={(_qid, value) => setAnswer(value)}
          />
        )}

        {tried && (
          <div className="flex items-start gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-sm text-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-success" />
            <span>
              {sample.explanation}
              {sample.answerKey && (
                <>
                  {" "}
                  Jawaban contoh yang benar: <b>{sample.answerKey}</b>.
                </>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => nav({ to: "/candidate/portal/test/$testId", params: { testId } })}>
          Lanjut ke {testLabel} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => nav({ to: "/candidate/portal/tests" })}>
          Kembali
        </Button>
      </div>
    </div>
  );
}
