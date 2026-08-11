import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { candidateGetTestIntro, candidateGetProfile } from "@/lib/candidate.functions";
import { useCandidateSession } from "@/lib/candidate-session";
import { practiceSampleFor } from "@/lib/practice-samples";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2, Lightbulb, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/candidate/portal/latihan/$testId")({
  head: () => ({
    meta: [
      { title: "Halaman Latihan Soal — Portal Kandidat Dover Chemical" },
      { name: "description", content: "Halaman latihan berisi petunjuk pengerjaan dan satu contoh soal sebelum kandidat masuk ke halaman test yang sebenarnya." },
      { property: "og:title", content: "Halaman Latihan Soal — Portal Kandidat Dover Chemical" },
      { property: "og:description", content: "Petunjuk pengerjaan dan satu contoh soal latihan sebelum psikotest dimulai." },
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
  const testIndex = ((profileQ.data?.tests ?? []) as any[]).findIndex((t: any) => t.id === testId);
  const testLabel = testIndex >= 0 ? `TEST ${testIndex + 1}` : "TEST";

  const intro = useQuery({
    queryKey: ["test-intro", testId, session?.code],
    queryFn: () => getIntro({ data: { code: session!.code, device: session!.device, test_id: testId } }),
    enabled: !!session,
    staleTime: Infinity,
  });

  const sample = practiceSampleFor((intro.data?.test as any)?.test_type);
  const [pick, setPick] = useState<string | null>(null);
  const [disc, setDisc] = useState<{ most?: string; least?: string }>({});
  const [text, setText] = useState("");
  const tried =
    sample.kind === "disc"
      ? !!(disc.most && disc.least && disc.most !== disc.least)
      : sample.kind === "text" || sample.kind === "pauli"
        ? text.trim() !== ""
        : !!pick;

  if (!session) {
    return (
      <Card>
        <CardContent className="space-y-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">Sesi kandidat tidak ditemukan. Silakan login kembali menggunakan kode akses Anda.</p>
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

  function toggleDisc(kind: "most" | "least", key: string) {
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
            Halaman ini terpisah dari halaman test. Waktu belum berjalan dan jawaban di sini tidak dinilai.
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

      <Card className="shadow-card">
        <CardContent className="space-y-4 p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contoh Soal</div>
          <p className="text-sm font-medium leading-relaxed">{sample.question}</p>

          {sample.kind === "disc" && (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
                <span>Pernyataan</span><span className="w-10 text-center">M</span><span className="w-10 text-center">L</span>
              </div>
              {(sample.options ?? []).map((o) => (
                <div key={o.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border p-2 text-sm">
                  <span>{o.text}</span>
                  <Button type="button" size="sm" variant={disc.most === o.key ? "default" : "outline"} className="w-10" onClick={() => toggleDisc("most", o.key)}>M</Button>
                  <Button type="button" size="sm" variant={disc.least === o.key ? "default" : "outline"} className="w-10" onClick={() => toggleDisc("least", o.key)}>L</Button>
                </div>
              ))}
            </div>
          )}

          {(sample.kind === "mcq" || sample.kind === "papi") && (
            <div className="space-y-2">
              {(sample.options ?? []).map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setPick(o.key)}
                  className={`flex w-full items-center gap-3 rounded-md border p-3 text-left text-sm transition-colors ${pick === o.key ? "border-primary bg-primary/10" : "hover:bg-accent"}`}
                >
                  <span className={`inline-flex h-7 w-7 flex-none items-center justify-center rounded-full border text-xs font-bold ${pick === o.key ? "border-primary bg-primary text-primary-foreground" : ""}`}>
                    {o.key.toUpperCase()}
                  </span>
                  {o.text}
                </button>
              ))}
            </div>
          )}

          {sample.kind === "eq" && (
            <div className="grid grid-cols-5 gap-2">
              {[
                { k: "1", t: "Tidak Terjadi" },
                { k: "2", t: "Jarang Terjadi" },
                { k: "3", t: "Kadang Terjadi" },
                { k: "4", t: "Kebiasaan" },
                { k: "5", t: "Selalu Terjadi" },
              ].map((s) => (
                <button
                  key={s.k}
                  type="button"
                  onClick={() => setPick(s.k)}
                  className={`rounded-md border p-2 text-center transition-colors ${pick === s.k ? "border-primary bg-primary/10" : "hover:bg-accent"}`}
                >
                  <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${pick === s.k ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{s.k}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{s.t}</div>
                </button>
              ))}
            </div>
          )}

          {(sample.kind === "text" || sample.kind === "pauli") && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Jawaban Anda:</span>
              <Input value={text} onChange={(e) => setText(e.target.value)} className="w-32" placeholder="( ... )" />
            </div>
          )}

          {tried && (
            <div className="flex items-start gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-sm text-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-success" />
              <span>
                {sample.explanation}
                {sample.answerKey && <> Jawaban contoh yang benar: <b>{sample.answerKey}</b>.</>}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => nav({ to: "/candidate/portal/test/$testId", params: { testId } })}>
          Lanjut ke {testLabel} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => nav({ to: "/candidate/portal/tests" })}>Kembali</Button>
      </div>
    </div>
  );
}
