import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { candidateStartTest, candidateSubmitTest, candidateSaveAnswer, candidateGetTestIntro, candidateGetProfile } from "@/lib/candidate.functions";
import { VoiceInstructionPlayer } from "@/components/voice-instruction";
import { PauliSheet, pauliFilledCount } from "@/components/pauli-sheet";
import { TestQuestionCard } from "@/components/test-question-card";
import { voiceTemplateFor } from "@/lib/voice-templates";
import { RotateCcw, Volume2 } from "lucide-react";
import { useCandidateSession } from "@/lib/candidate-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { reportIncident } from "@/lib/error-monitor";
import { Timer, Check, Loader2, AlertCircle, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import wptQ7 from "@/assets/wpt-q7.jpg.asset.json";
import wptQ38 from "@/assets/wpt-q38.png.asset.json";
import wptQ42 from "@/assets/wpt-q42.png.asset.json";
import wptQ49 from "@/assets/wpt-q49.jpg.asset.json";
import { WptSheet } from "@/components/wpt-sheet";
import { ISHIHARA_PLATES } from "@/lib/ishihara-plates";


const WPT_IMAGES: Record<number, { url: string; caption: string }> = {
  7: { url: wptQ7.url, caption: "Gambar pilihan 1–5 dan dua gambar dalam tanda kurung { }." },
  38: { url: wptQ38.url, caption: "Bentuk geometris dengan titik bernomor 1–14." },
  42: { url: wptQ42.url, caption: "Bentuk geometris dengan titik bernomor 1–24." },
  49: { url: wptQ49.url, caption: "Lima bagian bentuk bernomor 1–5." },
};


function WptImageFigure({ url, caption, number }: { url: string; caption: string; number: number }) {
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);
  const [dialogFailed, setDialogFailed] = useState(false);
  const alt = `Ilustrasi soal nomor ${number}`;

  if (failed) {
    return (
      <figure
        role="img"
        aria-label={`${alt} gagal dimuat`}
        className="mt-3 w-full rounded-md border border-dashed border-amber-300 bg-amber-50 p-4 text-amber-900"
      >
        <div className="flex items-start gap-3">
          <span aria-hidden className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-amber-100 text-base font-semibold">!</span>
          <div className="flex-1 text-xs sm:text-sm">
            <p className="font-medium">Ilustrasi soal nomor {number} gagal dimuat.</p>
            <p className="mt-1 leading-snug text-amber-800">
              Anda tetap dapat mengisi dan mengirim jawaban. Coba muat ulang gambar; jika masih gagal, lanjutkan mengerjakan berdasarkan deskripsi berikut.
            </p>
            <p className="mt-1 leading-snug italic text-amber-700">{caption}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
              onClick={() => { setFailed(false); setDialogFailed(false); }}
            >
              Muat ulang gambar
            </Button>
          </div>
        </div>
      </figure>
    );
  }

  return (
    <figure className="mt-3 w-full overflow-hidden rounded-md border bg-white p-2 sm:p-3">
      <Dialog onOpenChange={(o) => { if (!o) setZoom(1); }}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="group relative block w-full cursor-zoom-in"
            aria-label={`Perbesar ${alt}`}
          >
            <img
              src={url}
              alt={alt}
              className="mx-auto block h-auto w-full max-w-full object-contain sm:max-h-[60vh] sm:w-auto"
              loading="lazy"
              onError={() => setFailed(true)}
            />
            <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[11px] font-medium text-white opacity-90 shadow group-hover:opacity-100">
              <Maximize2 className="h-3.5 w-3.5" /> Perbesar
            </span>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-[95vw] p-3 sm:max-w-4xl">
          <DialogTitle className="text-sm">Ilustrasi Soal No. {number}</DialogTitle>
          <DialogDescription className="text-xs leading-snug">{caption}</DialogDescription>
          <div className="mt-2 flex items-center justify-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="Perkecil gambar" disabled={zoom <= 0.5 || dialogFailed}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <Button type="button" size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} aria-label="Perbesar gambar" disabled={zoom >= 4 || dialogFailed}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setZoom(1)} disabled={dialogFailed}>Reset</Button>
          </div>
          <div className="mt-2 max-h-[75vh] w-full overflow-auto rounded-md border bg-white">
            <div className="flex min-h-full min-w-full items-center justify-center p-3">
              {dialogFailed ? (
                <div className="w-full max-w-md rounded-md border border-dashed border-amber-300 bg-amber-50 p-4 text-center text-xs text-amber-900 sm:text-sm">
                  <p className="font-medium">Gambar tidak dapat dimuat.</p>
                  <p className="mt-1 leading-snug">Periksa koneksi internet Anda, lalu coba lagi. Jawaban Anda tetap bisa diisi dan dikirim.</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                    onClick={() => setDialogFailed(false)}
                  >
                    Coba lagi
                  </Button>
                </div>
              ) : (
                <img
                  src={url}
                  alt={alt}
                  style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
                  className="block h-auto max-w-none select-none transition-transform"
                  draggable={false}
                  onError={() => setDialogFailed(true)}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <figcaption className="mt-2 text-center text-[11px] leading-snug text-muted-foreground sm:text-xs">
        {caption} · <span className="font-medium">Klik gambar untuk memperbesar</span>
      </figcaption>
    </figure>
  );

}


export const Route = createFileRoute("/candidate/portal/test/$testId")({ head: () => ({ meta: [
    { title: "Pengerjaan Test — Portal Kandidat Dover Chemical" },
    { name: "description", content: "Halaman pengerjaan psikotest kandidat PT Dover Chemical dengan timer dan penyimpanan jawaban otomatis." },
    { property: "og:title", content: "Pengerjaan Test — Portal Kandidat Dover Chemical" },
    { property: "og:description", content: "Halaman pengerjaan psikotest kandidat PT Dover Chemical dengan timer dan penyimpanan jawaban otomatis." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: TakeTest });

function TakeTest() {
  const { testId } = Route.useParams();
  const session = useCandidateSession();
  const nav = useNavigate();
  const qc = useQueryClient();
  const start = useServerFn(candidateStartTest);
  const submit = useServerFn(candidateSubmitTest);
  const saveAnswer = useServerFn(candidateSaveAnswer);
  const getIntro = useServerFn(candidateGetTestIntro);
  const getProfile = useServerFn(candidateGetProfile);

  // Label generik: kandidat hanya melihat "TEST 1", "TEST 2", dst.
  const profileQ = useQuery({
    queryKey: ["candidate-profile", session?.code],
    queryFn: () => getProfile({ data: { code: session!.code, device: session!.device } }),
    enabled: !!session,
  });
  const testIndex = ((profileQ.data?.tests ?? []) as any[]).findIndex((t: any) => t.id === testId);
  const testLabel = testIndex >= 0 ? `TEST ${testIndex + 1}` : "TEST";

  // Instruction gate: the attempt (and timer) only starts after the candidate
  // has listened to / read the spoken instruction and pressed "Mulai Test".
  const [started, setStarted] = useState(false);
  const intro = useQuery({
    queryKey: ["test-intro", testId, session?.code],
    queryFn: () => getIntro({ data: { code: session!.code, device: session!.device, test_id: testId } }),
    enabled: !!session && !started,
    staleTime: Infinity,
  });

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["start-test", testId, session?.code],
    queryFn: () => start({ data: { code: session!.code, device: session!.device, test_id: testId } }),
    enabled: !!session && started,
    staleTime: Infinity,
    retry: 1,
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [discPicks, setDiscPicks] = useState<Record<string, { most?: string; least?: string }>>({});
  const [remaining, setRemaining] = useState<number>(0);
  const [timerReady, setTimerReady] = useState(false);
  const expiredRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const hydratedRef = useRef(false);
  const inflight = useRef(0);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});
  const replayVoiceRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);


  // Hydrate saved answers on first load so the candidate can resume.
  useEffect(() => {
    if (hydratedRef.current || !data?.attempt) return;
    hydratedRef.current = true;
    const restored: Record<string, string> = {};
    const restoredDisc: Record<string, { most?: string; least?: string }> = {};
    for (const row of (data.answers ?? []) as Array<{ question_id: string; answer: string }>) {
      restored[row.question_id] = row.answer;
      try {
        const parsed = JSON.parse(row.answer);
        if (parsed && (parsed.most || parsed.least)) {
          restoredDisc[row.question_id] = { most: parsed.most, least: parsed.least };
        }
      } catch { /* not JSON, regular answer */ }
    }
    if (Object.keys(restored).length > 0) {
      setAnswers(restored);
      if (Object.keys(restoredDisc).length > 0) setDiscPicks(restoredDisc);
      setSaveState("saved");
    }
  }, [data]);

  // Durasi selalu mengikuti pengaturan admin/HR (tests.duration_minutes) dan
  // dihitung terhadap jam SERVER, bukan jam perangkat kandidat.
  const deadlineRef = useRef<number | null>(null);
  useEffect(() => {
    if (!data?.test || !data?.attempt) return;
    const durMin = Number((data.test as any).duration_minutes);
    const startedAt = new Date(data.attempt.started_at).getTime();
    if (!Number.isFinite(durMin) || durMin <= 0 || !Number.isFinite(startedAt)) {
      // Durasi belum diatur -> jangan pernah auto-submit karena timer.
      deadlineRef.current = null;
      setRemaining(0);
      setTimerReady(false);
      return;
    }
    const serverNow = new Date((data as any).server_now ?? Date.now()).getTime();
    const skew = Number.isFinite(serverNow) ? Date.now() - serverNow : 0;
    deadlineRef.current = startedAt + durMin * 60_000 + skew;
    setRemaining(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
    setTimerReady(true);
  }, [data]);

  useEffect(() => {
    if (!timerReady || deadlineRef.current === null) return;
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil(((deadlineRef.current ?? 0) - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [timerReady]);

  useEffect(() => {
    // Waktu habis -> test otomatis dikunci & dikirim, walau belum ada jawaban.
    // `data.expired` menutup kasus kandidat menutup browser lalu kembali setelah
    // batas waktu server terlampaui.
    const serverExpired = !!(data as any)?.expired && data?.attempt?.status !== "finished";
    const timeUp = timerReady && remaining === 0;
    if (data && (serverExpired || timeUp) && !submitting && !expiredRef.current) {
      expiredRef.current = true;
      reportIncident(
        "test-auto-submit",
        `Test dikirim otomatis karena waktu habis (${testLabel})`,
        { test_id: testId, code: session?.code, answered: Object.keys(answers).length, server_expired: serverExpired },
      );
      handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, timerReady, data]);



  // --- Autosave callbacks -------------------------------------------------
  // These MUST stay above the early returns below: calling hooks after a
  // conditional return changes hook order between renders and crashes React.
  const dataRef = useRef(data);
  dataRef.current = data;
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const persist = useCallback(async (qid: string, answer: string) => {
    const d = dataRef.current;
    const s = sessionRef.current;
    if (!d?.attempt || !s) return;
    inflight.current += 1;
    setSaveState("saving");
    try {
      await saveAnswer({ data: { code: s.code, device: s.device, attempt_id: d.attempt.id, question_id: qid, answer } });
      inflight.current -= 1;
      if (inflight.current <= 0) { inflight.current = 0; setSaveState("saved"); }
    } catch (err) {
      inflight.current = Math.max(0, inflight.current - 1);
      setSaveState("error");
      reportIncident("autosave-gagal", "Jawaban gagal tersimpan (kemungkinan sinyal lemah)", {
        test_id: testId,
        question_id: qid,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, [saveAnswer]);

  const persistDebounced = useCallback((qid: string, answer: string, delay = 500) => {
    if (timers.current[qid]) clearTimeout(timers.current[qid]);
    setSaveState("saving");
    timers.current[qid] = setTimeout(() => { void persist(qid, answer); }, delay);
  }, [persist]);

  const pickMcq = useCallback((qid: string, key: string) => {
    setAnswers((a) => ({ ...a, [qid]: key }));
    void persist(qid, key);
  }, [persist]);

  const handleTextChange = useCallback((qid: string, value: string) => {
    setAnswers((a) => ({ ...a, [qid]: value }));
    persistDebounced(qid, value);
  }, [persistDebounced]);

  const setDisc = useCallback((qid: string, kind: "most" | "least", key: string) => {
    setDiscPicks((prev) => {
      const cur = { ...(prev[qid] ?? {}) };
      // Toggle off if same, else set and clear opposite if collides
      if (cur[kind] === key) delete cur[kind];
      else {
        cur[kind] = key;
        const other = kind === "most" ? "least" : "most";
        if (cur[other] === key) delete cur[other];
      }
      const next = { ...prev, [qid]: cur };
      if (cur.most && cur.least && cur.most !== cur.least) {
        const payload = JSON.stringify({ most: cur.most, least: cur.least });
        setAnswers((a) => ({ ...a, [qid]: payload }));
        void persist(qid, payload);
      } else {
        setAnswers((a) => { const c = { ...a }; delete c[qid]; return c; });
      }
      return next;
    });
  }, [persist]);

  // Flush pending debounced saves when leaving the page.
  useEffect(() => {
    const t = timers.current;
    return () => { Object.values(t).forEach((h) => h && clearTimeout(h)); };
  }, []);

  async function handleSubmit(auto = false) {
    if (!data) return;
    if (!auto && !confirm("Kirim jawaban? Anda tidak dapat mengubah setelah dikirim.")) return;
    setSubmitting(true);
    try {
      const payload = Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }));
      await submit({ data: { code: session!.code, device: session!.device, attempt_id: data.attempt.id, answers: payload } });
      toast.success("Jawaban terkirim. Hasil penilaian diproses oleh tim HR.");
      qc.removeQueries({ queryKey: ["start-test", testId, session?.code] });
      // Tunggu daftar test benar-benar tersegarkan supaya status "Selesai &
      // terkunci" langsung terlihat begitu kandidat kembali ke daftar test.
      await qc.invalidateQueries({ queryKey: ["candidate-profile"], refetchType: "all" });
      nav({ to: "/candidate/portal/tests", replace: true });

    } catch (e: any) {
      toast.error(e?.message || "Gagal mengirim jawaban. Coba lagi.");
      reportIncident("kirim-jawaban-gagal", `Gagal mengirim jawaban (${testLabel}): ${e?.message ?? "koneksi bermasalah"}`, {
        test_id: testId,
        auto,
        code: session?.code,
      });
    }
    finally { setSubmitting(false); }
  }



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

  if (!started) {
    const it: any = intro.data?.test;
    const voiceText: string = (it?.voice_instruction?.trim() || (it ? voiceTemplateFor(testLabel, it.test_type) : ""));
    const useAudio = !!(it?.voice_mode === "audio" && it?.voice_audio_url);
    return (
      <Card className="shadow-card">
        <CardHeader>
          <h1 className="font-display text-xl font-semibold leading-none tracking-tight text-primary">
            {intro.isLoading ? "Memuat instruksi..." : testLabel}
          </h1>
        </CardHeader>
        <CardContent className="space-y-4">
          {intro.error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {(intro.error as any)?.message || "Gagal memuat instruksi test."}
            </div>
          )}
          {it && (
            <>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Timer className="h-4 w-4" /> {it.duration_minutes} menit</span>
                {intro.data?.resumed && <span className="rounded bg-accent px-2 py-0.5 text-xs">Melanjutkan pengerjaan</span>}
              </div>
              {useAudio ? (
                <div className="space-y-2 rounded-lg border bg-accent/40 p-4">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    <Volume2 className="h-4 w-4" /> Instruksi Suara — {testLabel}
                  </span>
                  <audio
                    controls
                    autoPlay={!!it.voice_autoplay}
                    src={it.voice_audio_url}
                    ref={audioRef}
                    className="w-full"
                  />
                  <Button type="button" size="sm" variant="secondary"
                    onClick={() => { const a = audioRef.current; if (a) { a.currentTime = 0; void a.play(); } }}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Ulangi instruksi
                  </Button>
                  {voiceText && (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{voiceText}</p>
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
              <p className="text-xs text-muted-foreground">
                Waktu pengerjaan baru berjalan setelah Anda menekan tombol <b>Mulai Test</b>.
              </p>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { try { window.speechSynthesis?.cancel(); audioRef.current?.pause(); } catch { /* noop */ } setStarted(true); }} disabled={intro.isLoading || !!intro.error}>
              Mulai Test
            </Button>
            {it && !useAudio && voiceText && (
              <Button variant="secondary" onClick={() => replayVoiceRef.current?.()}>
                <RotateCcw className="mr-1.5 h-4 w-4" /> Ulangi instruksi
              </Button>
            )}
            <Button variant="outline" onClick={() => nav({ to: "/candidate/portal/tests" })}>Kembali</Button>
          </div>
        </CardContent>
      </Card>
    );
  }


  // Error must be checked BEFORE the loading branch: when the server rejects
  // the request (e.g. biodata belum lengkap) `data` stays undefined and the
  // page previously hung forever on "Memuat test...".
  if (error || (!isLoading && (!data || !data.test || !data.attempt))) {
    const msg = (error as any)?.message || "Test tidak dapat dimuat. Periksa koneksi Anda atau hubungi admin.";
    const needsBiodata = /data diri|biodata/i.test(msg);
    return (
      <Card className="border-destructive/40">
        <CardContent className="space-y-3 py-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <div className="font-medium text-destructive">
            {needsBiodata ? "Data diri belum lengkap" : "Gagal memuat test"}
          </div>
          <p className="text-sm text-muted-foreground">{msg}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {needsBiodata ? (
              <Button onClick={() => nav({ to: "/candidate/portal/data" })}>Lengkapi Data Diri</Button>
            ) : (
              <Button variant="outline" onClick={() => refetch()}>Coba lagi</Button>
            )}
            <Button variant="outline" onClick={() => nav({ to: "/candidate/portal/tests" })}>Kembali ke daftar test</Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat test...
        </CardContent>
      </Card>
    );
  }
  if (!data.test || !data.attempt) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="space-y-3 py-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <div className="font-medium text-destructive">Gagal memuat test</div>
          <Button onClick={() => nav({ to: "/candidate/portal/tests" })}>Kembali ke daftar test</Button>
        </CardContent>
      </Card>

    );
  }
  if (data.attempt.status === "finished") {
    return (
      <Card>
        <CardContent className="space-y-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Test sudah selesai dan jawaban Anda telah tersimpan. Hasil penilaian tidak ditampilkan dan akan diproses oleh tim HR.
          </p>
          <Button onClick={() => nav({ to: "/candidate/portal/tests" })}>Kembali ke daftar test</Button>
        </CardContent>
      </Card>
    );
  }

  // Waktu habis -> halaman langsung terkunci (tidak bisa diisi lagi) sambil
  // jawaban terakhir dikirim otomatis.
  const timeUp = !!(data as any).expired || (timerReady && remaining === 0);
  if (timeUp) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="space-y-3 py-10 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <div className="font-display text-lg font-semibold text-destructive">WAKTU HABIS — TEST TERKUNCI</div>
          <p className="text-sm text-muted-foreground">
            {submitting
              ? "Menyimpan dan mengunci jawaban Anda..."
              : "Waktu pengerjaan sudah berakhir. Jawaban yang tersimpan otomatis telah dikirim ke tim HR."}
          </p>
          <Button onClick={() => nav({ to: "/candidate/portal/tests" })} disabled={submitting}>
            Kembali ke daftar test
          </Button>
        </CardContent>
      </Card>
    );
  }





  const mins = Math.floor(remaining / 60).toString().padStart(2, "0");
  const secs = (remaining % 60).toString().padStart(2, "0");
  const total = data.questions.length;
  const isDisc = data.test.test_type === "disc";
  const isWpt = data.test.test_type === "wpt";
  const isPauli = data.test.test_type === "pauli";

  const answered = isDisc
    ? Object.values(discPicks).filter((p) => p.most && p.least && p.most !== p.least).length
    : isPauli
      ? data.questions.filter((q: any) => pauliFilledCount(answers[q.id]) > 0).length
      : Object.keys(answers).filter((k) => (answers[k] ?? "").trim() !== "").length;




  return (
    <div className="space-y-6">
      <>

      <Card className="shadow-card">

        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-semibold leading-none tracking-tight text-primary">{testLabel}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">
                <div className="flex items-center gap-2"><Timer className="h-4 w-4" /> <span className="font-mono text-lg">{timerReady ? `${mins}:${secs}` : "--:--"}</span></div>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span>Progress</span>
                <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5">
                  {saveState === "saving" && (<><Loader2 className="h-3 w-3 animate-spin" /> Menyimpan...</>)}
                  {saveState === "saved" && (<><Check className="h-3 w-3 text-success" /> Tersimpan otomatis</>)}
                  {saveState === "error" && (<><AlertCircle className="h-3 w-3 text-destructive" /> Gagal menyimpan</>)}
                  {saveState === "idle" && (<><Check className="h-3 w-3 opacity-40" /> Autosave aktif</>)}
                </span>
              </div>
              <span>{answered}/{total} soal</span>
            </div>
            <Progress value={(answered / total) * 100} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Tanpa petunjuk apa pun: seluruh petunjuk & contoh soal ada di halaman latihan terpisah. */}






      {isPauli && (
        <PauliSheet
          questions={data.questions as any}
          answers={answers}
          onChange={(qid, value) => {
            setAnswers((prev) => ({ ...prev, [qid]: value }));
            persistDebounced(qid, value, 800);
          }}
        />
      )}

      {isWpt && (
        <WptSheet
          questions={data.questions as any}
          answers={answers}
          images={WPT_IMAGES}
          onChange={handleTextChange}
          renderImage={(img, number) => (
            <WptImageFigure url={img.url} caption={img.caption} number={number} />
          )}
        />
      )}

      <div className={isPauli || isWpt ? "hidden" : "space-y-4"}>
        {(isPauli || isWpt ? [] : data.questions).map((q: any, i: number) => (
          <TestQuestionCard
            key={q.id}
            q={q}
            index={i}
            total={total}
            testType={data.test!.test_type as any}
            answer={answers[q.id] ?? ""}
            discPick={discPicks[q.id]}
            wptImage={data.test!.test_type === "ishihara" ? ISHIHARA_PLATES[q.question_number] ?? null : null}
            onPickMcq={pickMcq}
            onSetDisc={setDisc}
            onChangeText={handleTextChange}
          />
        ))}
      </div>



      <div className="sticky bottom-4 flex justify-end">
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button size="lg" disabled={submitting || answered === 0}>
              {submitting ? "Mengirim..." : `Kirim Jawaban (${answered}/${total})`}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kirim jawaban sekarang?</AlertDialogTitle>
              <AlertDialogDescription>
                Anda sudah mengisi {answered} dari {total} soal. Jawaban tidak dapat diubah setelah dikirim.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Periksa lagi</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e: React.MouseEvent) => { e.preventDefault(); setConfirmOpen(false); void handleSubmit(true); }}
                disabled={submitting}
              >
                Ya, kirim jawaban
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      </>

    </div>
  );
}
