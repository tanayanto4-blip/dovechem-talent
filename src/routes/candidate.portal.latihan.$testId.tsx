import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
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
import { ArrowRight, Loader2, Lightbulb, CheckCircle2, Volume2, Timer, RotateCcw } from "lucide-react";
import { VoiceInstructionPlayer } from "@/components/voice-instruction";
import { voiceTemplateFor } from "@/lib/voice-templates";

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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const replayVoiceRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const it: any = intro.data?.test;
  const voiceText: string =
    it?.voice_instruction?.trim() || (it ? voiceTemplateFor(testLabel, it.test_type) : "");
  const useAudio = !!(it?.voice_mode === "audio" && it?.voice_audio_url);

  function stopVoice() {
    try {
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
    } catch {
      /* noop */
    }
  }

  const steps = [
    { n: 1, label: "Instruksi" },
    { n: 2, label: "Contoh Soal" },
    { n: 3, label: "Mulai Test" },
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <h1 className="font-display text-2xl font-semibold leading-none tracking-tight text-primary">
            {testLabel}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ikuti tahapan berikut: dengarkan instruksi, kerjakan contoh soal, lalu mulai test. Waktu
            baru berjalan setelah Anda masuk ke halaman test.
          </p>
          <ol className="mt-4 flex flex-wrap gap-2">
            {steps.map((s) => (
              <li
                key={s.n}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                  step === s.n
                    ? "border-primary bg-primary text-primary-foreground"
                    : step > s.n
                      ? "border-success/50 bg-success/10 text-success"
                      : "border-border text-muted-foreground"
                }`}
              >
                <span className="font-bold">{s.n}</span> {s.label}
              </li>
            ))}
          </ol>
        </CardHeader>
      </Card>

      {step === 1 && (
        <Card className="shadow-card">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Volume2 className="h-4 w-4" /> Langkah 1 — Instruksi Pengerjaan
            </div>
            {intro.error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {(intro.error as any)?.message || "Gagal memuat instruksi test."}
              </div>
            )}
            {it && (
              <>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Timer className="h-4 w-4" /> {it.duration_minutes} menit
                  </span>
                </div>
                {useAudio ? (
                  <div className="space-y-2 rounded-lg border bg-accent/40 p-4">
                    <audio
                      controls
                      autoPlay={!!it.voice_autoplay}
                      src={it.voice_audio_url}
                      ref={audioRef}
                      className="w-full"
                    />
                    {voiceText && (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                        {voiceText}
                      </p>
                    )}
                  </div>
                ) : (
                  <VoiceInstructionPlayer
                    text={voiceText}
                    lang={it.voice_lang}
                    rate={Number(it.voice_rate)}
                    autoplay={it.voice_enabled !== false && !!it.voice_autoplay}
                    title={`Instruksi Suara — ${testLabel}`}
                    replayRef={replayVoiceRef}
                  />
                )}
              </>
            )}
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <Lightbulb className="h-4 w-4" /> Langkah Pengerjaan
              </div>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                {sample.instructions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  stopVoice();
                  setStep(2);
                }}
              >
                Lanjut ke Contoh Soal <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {it && !useAudio && voiceText && (
                <Button variant="secondary" onClick={() => replayVoiceRef.current?.()}>
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Ulangi instruksi
                </Button>
              )}
              <Button variant="outline" onClick={() => nav({ to: "/candidate/portal/tests" })}>
                Kembali
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Langkah 2 — Contoh Soal &amp; Lembar Jawaban (tidak dinilai)
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

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setStep(3)}>
              Selesai Latihan <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setStep(1)}>
              Dengarkan Instruksi Lagi
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <Card className="shadow-card">
          <CardContent className="space-y-4 p-6 text-sm">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" /> Langkah 3 — Siap Mengerjakan Test
            </div>
            <p className="text-muted-foreground">
              Waktu pengerjaan ({it?.duration_minutes ?? "-"} menit) mulai berjalan begitu Anda
              menekan tombol di bawah. Jawaban tersimpan otomatis.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  stopVoice();
                  nav({
                    to: "/candidate/portal/test/$testId",
                    params: { testId },
                    search: { siap: 1 },
                  });
                }}
              >
                Mulai {testLabel} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setStep(2)}>
                Kembali ke Contoh Soal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
