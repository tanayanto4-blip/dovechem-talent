import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { candidateStartTest, candidateSubmitTest, candidateSaveAnswer } from "@/lib/candidate.functions";
import { useCandidateSession } from "@/lib/candidate-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Timer, Check, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/candidate/portal/test/$testId")({ component: TakeTest });

function TakeTest() {
  const { testId } = Route.useParams();
  const session = useCandidateSession();
  const nav = useNavigate();
  const qc = useQueryClient();
  const start = useServerFn(candidateStartTest);
  const submit = useServerFn(candidateSubmitTest);
  const saveAnswer = useServerFn(candidateSaveAnswer);

  const { data, isLoading } = useQuery({
    queryKey: ["start-test", testId, session?.code],
    queryFn: () => start({ data: { code: session!.code, test_id: testId } }),
    enabled: !!session,
    staleTime: Infinity,
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [discPicks, setDiscPicks] = useState<Record<string, { most?: string; least?: string }>>({});
  const [remaining, setRemaining] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const hydratedRef = useRef(false);

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

  useEffect(() => {
    if (!data?.test || !data?.attempt) return;
    const dur = data.test.duration_minutes * 60;
    const started = new Date(data.attempt.started_at).getTime();
    const left = Math.max(0, Math.floor((started + dur * 1000 - Date.now()) / 1000));
    setRemaining(left);
  }, [data]);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  useEffect(() => {
    if (data && remaining === 0 && !submitting && Object.keys(answers).length > 0) {
      handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  async function handleSubmit(auto = false) {
    if (!data) return;
    if (!auto && !confirm("Kirim jawaban? Anda tidak dapat mengubah setelah dikirim.")) return;
    setSubmitting(true);
    try {
      const payload = Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }));
      const res = await submit({ data: { code: session!.code, attempt_id: data.attempt.id, answers: payload } });
      toast.success(`Test selesai. Skor: ${res.score}`);
      qc.invalidateQueries({ queryKey: ["candidate-profile"] });
      nav({ to: "/candidate/portal/tests" });
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  }

  if (isLoading || !data || !data.test) return <div className="text-muted-foreground">Memuat test...</div>;
  if (data.attempt.status === "finished") {
    return <Card><CardContent className="py-8 text-center">Test sudah selesai. Skor: <b>{data.attempt.score}</b></CardContent></Card>;
  }

  const mins = Math.floor(remaining / 60).toString().padStart(2, "0");
  const secs = (remaining % 60).toString().padStart(2, "0");
  const total = data.questions.length;
  const isKraepelin = data.test.test_type === "kraepelin";
  const isDisc = data.test.test_type === "disc";
  const isMbti = data.test.test_type === "mbti";
  const isEq = data.test.test_type === "eq";
  const answered = isDisc
    ? Object.values(discPicks).filter((p) => p.most && p.least && p.most !== p.least).length
    : Object.keys(answers).length;

  const inflight = useRef(0);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});
  async function persist(qid: string, answer: string) {
    if (!data?.attempt || !session) return;
    inflight.current += 1;
    setSaveState("saving");
    try {
      await saveAnswer({ data: { code: session.code, attempt_id: data.attempt.id, question_id: qid, answer } });
      inflight.current -= 1;
      if (inflight.current <= 0) { inflight.current = 0; setSaveState("saved"); }
    } catch (e) {
      inflight.current = Math.max(0, inflight.current - 1);
      setSaveState("error");
    }
  }
  function persistDebounced(qid: string, answer: string, delay = 500) {
    if (timers.current[qid]) clearTimeout(timers.current[qid]);
    setSaveState("saving");
    timers.current[qid] = setTimeout(() => { persist(qid, answer); }, delay);
  }
  function pickMcq(qid: string, key: string) {
    setAnswers((a) => ({ ...a, [qid]: key }));
    persist(qid, key);
  }

  function setDisc(qid: string, kind: "most" | "least", key: string) {
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
      // sync to answers as JSON when both chosen; autosave that JSON
      if (cur.most && cur.least && cur.most !== cur.least) {
        const payload = JSON.stringify({ most: cur.most, least: cur.least });
        setAnswers((a) => ({ ...a, [qid]: payload }));
        persist(qid, payload);
      } else {
        setAnswers((a) => { const c = { ...a }; delete c[qid]; return c; });
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="font-display text-2xl text-primary">{data.test.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{data.test.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">
                <div className="flex items-center gap-2"><Timer className="h-4 w-4" /> <span className="font-mono text-lg">{mins}:{secs}</span></div>
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

      {isDisc && (
        <Card className="border-primary/30 bg-primary/5 shadow-card">
          <CardContent className="space-y-2 p-6 text-sm">
            <div className="font-semibold text-primary">Petunjuk Pengisian DISC</div>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Setiap kelompok berisi 4 pernyataan.</li>
              <li>Pilih <b className="text-foreground">M (Most)</b> pada pernyataan yang <b>paling menggambarkan</b> diri Anda.</li>
              <li>Pilih <b className="text-foreground">L (Least)</b> pada pernyataan yang <b>paling tidak menggambarkan</b> diri Anda.</li>
              <li>Hanya boleh 1 M dan 1 L per kelompok, dan tidak boleh pada pernyataan yang sama.</li>
              <li>Jawablah spontan sesuai diri Anda — tidak ada jawaban benar/salah.</li>
            </ol>
          </CardContent>
        </Card>
      )}

      {isMbti && (
        <Card className="border-primary/30 bg-primary/5 shadow-card">
          <CardContent className="space-y-4 p-6 text-sm">
            <div>
              <div className="font-semibold text-primary">Konsep MBTI</div>
              <p className="mt-1 text-muted-foreground">
                MBTI memetakan kecenderungan alami Anda pada 4 pasangan preferensi. Setiap nomor
                berisi 2 pernyataan (A &amp; B) — pilih salah satu yang <b className="text-foreground">paling menggambarkan</b> diri Anda.
                Tidak ada jawaban benar/salah; jawablah spontan sesuai diri Anda sehari-hari.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  pair: "E vs I",
                  title: "Sumber Energi",
                  left: { k: "E", name: "Extraversion", desc: "Mendapat energi dari dunia luar: interaksi, aktivitas, berbicara." },
                  right: { k: "I", name: "Introversion", desc: "Mendapat energi dari dunia dalam: refleksi, ide, ketenangan." },
                },
                {
                  pair: "S vs N",
                  title: "Cara Menyerap Informasi",
                  left: { k: "S", name: "Sensing", desc: "Fokus pada fakta, detail, pengalaman nyata, dan hal praktis." },
                  right: { k: "N", name: "Intuition", desc: "Fokus pada pola, kemungkinan, konsep, dan gambaran besar." },
                },
                {
                  pair: "T vs F",
                  title: "Cara Mengambil Keputusan",
                  left: { k: "T", name: "Thinking", desc: "Menimbang secara logis, obyektif, berdasar sebab-akibat dan aturan." },
                  right: { k: "F", name: "Feeling", desc: "Menimbang nilai personal, empati, dampak pada orang lain." },
                },
                {
                  pair: "J vs P",
                  title: "Gaya Hidup & Kerja",
                  left: { k: "J", name: "Judging", desc: "Terencana, terstruktur, suka kepastian, jadwal, dan keputusan cepat." },
                  right: { k: "P", name: "Perceiving", desc: "Fleksibel, spontan, terbuka pada pilihan baru, adaptif." },
                },
              ].map((row) => (
                <div key={row.pair} className="rounded-md border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">{row.pair}</span>
                    <span className="text-[11px] text-muted-foreground">{row.title}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border bg-muted/40 p-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">{row.left.k}</span>
                        <b className="text-foreground">{row.left.name}</b>
                      </div>
                      <p className="mt-1 text-muted-foreground leading-snug">{row.left.desc}</p>
                    </div>
                    <div className="rounded border bg-muted/40 p-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-[11px] font-bold">{row.right.k}</span>
                        <b className="text-foreground">{row.right.name}</b>
                      </div>
                      <p className="mt-1 text-muted-foreground leading-snug">{row.right.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-primary/20 bg-background p-3 text-xs text-muted-foreground">
              Hasil akhir berupa <b className="text-foreground">4 huruf</b> (contoh: <b className="text-primary">INTJ</b>, <b className="text-primary">ESFP</b>) yang mewakili kombinasi preferensi Anda pada keempat pasangan di atas.
            </div>
          </CardContent>
        </Card>
      )}

      {isEq && (
        <Card className="border-primary/30 bg-primary/5 shadow-card">
          <CardContent className="space-y-4 p-6 text-sm">
            <div>
              <div className="font-semibold text-primary">Petunjuk Pengisian EQ (Emotional Quotient)</div>
              <p className="mt-1 text-muted-foreground">
                Baca setiap pernyataan lalu nilai seberapa <b className="text-foreground">kuat pernyataan itu berlaku untuk Anda</b> pada skala <b className="text-foreground">1 sampai 5</b>.
                Tidak ada jawaban benar/salah — jawablah spontan dan jujur sesuai keseharian Anda.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
              {[
                { k: "1", t: "Tidak Terjadi" },
                { k: "2", t: "Jarang Terjadi" },
                { k: "3", t: "Kadang Terjadi" },
                { k: "4", t: "Kebiasaan" },
                { k: "5", t: "Selalu Terjadi" },
              ].map((s) => (
                <div key={s.k} className="rounded-md border bg-background p-2 text-center">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">{s.k}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{s.t}</div>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-primary/20 bg-background p-3 text-xs text-muted-foreground">
              Kuesioner ini mengukur 5 dimensi kecerdasan emosional: <b className="text-foreground">Kesadaran Diri, Pengelolaan Emosi, Motivasi, Empati,</b> dan <b className="text-foreground">Keterampilan Sosial</b>.
            </div>
          </CardContent>
        </Card>
      )}





      <div className="space-y-4">
        {data.questions.map((q: any, i: number) => (
          <Card key={q.id} className="shadow-card">
            <CardContent className="p-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-secondary">
                  {isDisc ? `Kelompok ${i + 1} dari ${total}` : `Soal ${i + 1}`}
                </div>
                {isDisc && (
                  <div className="text-[11px] text-muted-foreground">
                    {discPicks[q.id]?.most && discPicks[q.id]?.least ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">✓ Terisi</span>
                    ) : (
                      <span>Pilih 1 M &amp; 1 L</span>
                    )}
                  </div>
                )}
              </div>
              {!isDisc && !isMbti && <div className="text-base font-medium">{q.question_text}</div>}
              {isMbti ? (
                <div className="rounded-md border bg-card">
                  {q.question_text && (
                    <div className="border-b bg-muted/40 px-3 sm:px-4 py-2 text-sm font-medium">
                      {q.question_text}
                    </div>
                  )}
                  <div className="grid grid-cols-[1fr_3rem_3rem_1fr] items-stretch">
                    {(() => {
                      const opts = q.options ?? [];
                      const a = opts[0];
                      const b = opts[1];
                      if (!a || !b) return null;
                      const picked = answers[q.id];
                      const setVal = (key: string, v: string) => {
                        if (v.trim() === "1") pickMcq(q.id, key);
                        else if (picked === key) {
                          setAnswers((prev) => { const c = { ...prev }; delete c[q.id]; return c; });
                          persist(q.id, "");
                        }
                      };
                      const Cell = ({ opt, side }: { opt: any; side: "left" | "right" }) => {
                        const isPicked = picked === opt.key;
                        return (
                          <>
                            {side === "left" && (
                              <button
                                type="button"
                                onClick={() => pickMcq(q.id, opt.key)}
                                className={`flex-1 text-left px-3 sm:px-4 py-3 text-xs sm:text-sm transition border-r ${isPicked ? "bg-primary/10" : "hover:bg-accent"}`}
                              >
                                <span className="mr-2 font-bold text-primary">A.</span>
                                {opt.label}
                              </button>
                            )}
                            <div className={`flex items-center justify-center border-r ${isPicked ? "bg-primary/10" : ""}`}>
                              <Input
                                inputMode="numeric"
                                maxLength={1}
                                value={isPicked ? "1" : ""}
                                onChange={(e) => setVal(opt.key, e.target.value)}
                                placeholder="_"
                                aria-label={`Isi 1 untuk ${side === "left" ? "A" : "B"}`}
                                className="h-9 w-10 text-center font-bold"
                              />
                            </div>
                            {side === "right" && (
                              <button
                                type="button"
                                onClick={() => pickMcq(q.id, opt.key)}
                                className={`flex-1 text-left px-3 sm:px-4 py-3 text-xs sm:text-sm transition ${isPicked ? "bg-primary/10" : "hover:bg-accent"}`}
                              >
                                <span className="mr-2 font-bold text-primary">B.</span>
                                {opt.label}
                              </button>
                            )}
                          </>
                        );
                      };
                      return (
                        <>
                          <Cell opt={a} side="left" />
                          <Cell opt={b} side="right" />
                        </>
                      );
                    })()}
                  </div>
                  <div className="border-t bg-muted/40 px-3 sm:px-4 py-2 text-[11px] text-muted-foreground">
                    Isi angka <b className="text-foreground">1</b> pada kolom A atau B — pilih salah satu yang paling menggambarkan diri Anda.
                  </div>
                </div>
              ) : isKraepelin ? (
                <div className="mt-4 max-w-xs">
                  <Label className="text-xs text-muted-foreground">Jawaban Anda</Label>
                  <Input inputMode="numeric" value={answers[q.id] ?? ""} onChange={(e) => { const v = e.target.value; setAnswers({ ...answers, [q.id]: v }); persistDebounced(q.id, v); }} className="mt-1" />
                </div>
              ) : isDisc ? (
                <div className="rounded-md border bg-card">
                  <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] sm:grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-x-2 sm:gap-x-3 px-2 sm:px-4 py-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b bg-muted/40">
                    <span className="text-center text-primary">M</span>
                    <span>Pernyataan</span>
                    <span className="text-center text-destructive">L</span>
                  </div>
                  <div className="divide-y">
                    {(q.options ?? []).map((opt: any) => {
                      const pick = discPicks[q.id] ?? {};
                      const isMost = pick.most === opt.key;
                      const isLeast = pick.least === opt.key;
                      return (
                        <div
                          key={opt.key}
                          className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] sm:grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-x-2 sm:gap-x-3 px-2 sm:px-4 py-3"
                        >
                          <button
                            type="button"
                            onClick={() => setDisc(q.id, "most", opt.key)}
                            aria-label={`Paling menggambarkan: ${opt.label}`}
                            className={`h-9 w-9 shrink-0 justify-self-center rounded-md border text-xs font-bold transition ${
                              isMost
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-input bg-background text-muted-foreground hover:border-primary/40 hover:text-primary"
                            }`}
                          >
                            M
                          </button>
                          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                            <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] sm:text-xs font-bold text-muted-foreground">
                              {opt.key.toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1 break-words text-[13px] sm:text-sm leading-snug">{opt.label}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDisc(q.id, "least", opt.key)}
                            aria-label={`Paling tidak menggambarkan: ${opt.label}`}
                            className={`h-9 w-9 shrink-0 justify-self-center rounded-md border text-xs font-bold transition ${
                              isLeast
                                ? "border-destructive bg-destructive text-destructive-foreground shadow-sm"
                                : "border-input bg-background text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                            }`}
                          >
                            L
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 border-t bg-muted/40 px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] text-muted-foreground">
                    <span><b className="text-primary">M</b> (kiri) = Paling menggambarkan diri Anda</span>
                    <span><b className="text-destructive">L</b> (kanan) = Paling tidak menggambarkan</span>
                  </div>
                </div>



              ) : (
                <RadioGroup className="mt-4 space-y-2" value={answers[q.id] ?? ""} onValueChange={(v) => pickMcq(q.id, v)}>
                  {(q.options ?? []).map((opt: any) => (
                    <label key={opt.key} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent">
                      <RadioGroupItem value={opt.key} id={`${q.id}-${opt.key}`} />
                      <span className="text-sm"><b className="mr-2">{opt.key}.</b>{opt.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}
            </CardContent>
          </Card>
        ))}
      </div>


      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" onClick={() => handleSubmit(false)} disabled={submitting || answered === 0}>
          {submitting ? "Mengirim..." : `Kirim Jawaban (${answered}/${total})`}
        </Button>
      </div>
    </div>
  );
}
