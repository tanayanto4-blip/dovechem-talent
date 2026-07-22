import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { candidateGetAttempt } from "@/lib/candidate.functions";
import { useCandidateSession } from "@/lib/candidate-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileDown } from "lucide-react";
import { exportMbtiPdf } from "@/lib/mbti-pdf";

export const Route = createFileRoute("/candidate/portal/result/$attemptId")({ component: CandidateResult });

function CandidateResult() {
  const { attemptId } = Route.useParams();
  const session = useCandidateSession();
  const fn = useServerFn(candidateGetAttempt);
  const { data, isLoading } = useQuery({
    queryKey: ["candidate-attempt", attemptId, session?.code],
    queryFn: () => fn({ data: { code: session!.code, attempt_id: attemptId } }),
    enabled: !!session,
  });

  if (!session) return null;
  if (isLoading || !data) return <div className="text-muted-foreground">Memuat...</div>;
  const a = data.attempt as any;
  const t = a.tests;
  const answerMap = new Map<string, any>((a.test_answers ?? []).map((x: any) => [x.question_id, x]));
  const isDisc = t?.test_type === "disc";
  const isMbti = t?.test_type === "mbti";

  return (
    <div className="space-y-6 print-area">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm"><Link to="/candidate/portal/tests"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Link></Button>
        <div className="flex gap-2">
          {isMbti && a.result?.type && (
            <Button size="sm" variant="secondary" onClick={() => exportMbtiPdf(a.result, {
              candidateName: session.candidate_name ?? a.candidates?.full_name,
              candidateCode: session.code,
              position: a.candidates?.position ?? undefined,
              attemptId: a.id,
              finishedAt: a.finished_at,
              score: a.score,
            })}>
              <FileDown className="mr-2 h-4 w-4" /> Unduh PDF MBTI
            </Button>
          )}
          <Button size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Cetak</Button>
        </div>
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">Hasil — {t?.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="uppercase">{t?.test_type}</Badge>
          <Badge className={a.status === "finished" ? "bg-success" : ""} variant={a.status === "finished" ? "default" : "secondary"}>
            {a.status === "finished" ? `Skor: ${a.score}` : "Belum selesai"}
          </Badge>
        </div>
      </div>

      {a.result && isDisc && a.result.most && (
        <Card className="shadow-card">
          <CardHeader><CardTitle>Profil DISC — Dominan: <span className="text-primary">{a.result.dominant}</span></CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {(["D","I","S","C"] as const).map((k) => (
                <div key={k} className="rounded border bg-muted/40 p-2">
                  <div className="text-lg font-bold text-primary">{k}</div>
                  <div>Most: <b>{a.result.most?.[k] ?? 0}</b></div>
                  <div>Least: <b>{a.result.least?.[k] ?? 0}</b></div>
                  <div>Change: <b>{a.result.change?.[k] ?? 0}</b></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {a.result && isMbti && a.result.type && <MbtiSummary result={a.result} />}


      <div className="space-y-3">
        {data.questions.map((q: any, i: number) => {
          const ans = answerMap.get(q.id);
          let disc: { most?: string; least?: string } | null = null;
          if (isDisc && ans?.answer) { try { disc = JSON.parse(ans.answer); } catch { disc = null; } }
          return (
            <Card key={q.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="mb-2 text-xs uppercase text-muted-foreground">
                  {isDisc ? `Kelompok ${i + 1}` : `Soal ${i + 1}`}
                </div>
                {q.question_text && <div className="mb-2 text-sm font-medium">{q.question_text}</div>}
                {isDisc ? (
                  <div className="overflow-hidden rounded-md border text-sm">
                    {(q.options ?? []).map((opt: any) => {
                      const isMost = disc?.most === opt.key;
                      const isLeast = disc?.least === opt.key;
                      return (
                        <div key={opt.key} className="grid grid-cols-[1fr_64px_64px] items-center border-t first:border-t-0">
                          <div className="px-3 py-2">{opt.label}</div>
                          <div className={`border-l py-2 text-center ${isMost ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"}`}>{isMost ? "M" : "·"}</div>
                          <div className={`border-l py-2 text-center ${isLeast ? "bg-destructive text-destructive-foreground font-bold" : "text-muted-foreground"}`}>{isLeast ? "L" : "·"}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1 text-sm">
                    {(q.options ?? []).map((opt: any) => {
                      const picked = ans?.answer === opt.key;
                      return (
                        <div key={opt.key} className={`flex items-center gap-2 rounded border p-2 ${picked ? "border-primary bg-primary/10" : ""}`}>
                          <span className="font-mono">{opt.key}.</span>
                          <span className="flex-1">{opt.label}</span>
                          {picked && <Badge>Jawaban Anda</Badge>}
                        </div>
                      );
                    })}
                    {!ans && <div className="text-xs italic text-muted-foreground">Tidak dijawab</div>}
                    {ans && !(q.options ?? []).some((o: any) => o.key === ans.answer) && (
                      <div className="rounded border bg-muted/40 p-2 text-xs">Jawaban: <b>{ans.answer}</b></div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

const MBTI_TYPE_SUMMARY: Record<string, { nick: string; desc: string; strengths: string; watch: string }> = {
  ISTJ: { nick: "The Inspector", desc: "Teliti, bertanggung jawab, dan menjunjung prosedur.", strengths: "Disiplin, terorganisir, dapat diandalkan.", watch: "Cenderung kaku terhadap perubahan mendadak." },
  ISFJ: { nick: "The Protector", desc: "Setia, perhatian, dan konsisten mendukung tim.", strengths: "Empati tinggi, teliti, sabar.", watch: "Sulit menolak permintaan; rentan overload." },
  INFJ: { nick: "The Advocate", desc: "Visioner idealis dengan kepekaan interpersonal.", strengths: "Insight mendalam, komitmen pada nilai.", watch: "Perfeksionis, mudah lelah secara emosional." },
  INTJ: { nick: "The Architect", desc: "Strategis, analitis, dan berorientasi tujuan jangka panjang.", strengths: "Berpikir sistemik, mandiri, tegas.", watch: "Bisa terkesan dingin; kurang toleran pada inefisiensi." },
  ISTP: { nick: "The Craftsman", desc: "Praktis, tenang, dan cekatan memecahkan masalah teknis.", strengths: "Adaptif, logis, sigap dalam situasi mendesak.", watch: "Kurang menyukai perencanaan panjang." },
  ISFP: { nick: "The Composer", desc: "Ramah, artistik, dan menghargai harmoni.", strengths: "Peka pada detail, kooperatif, otentik.", watch: "Menghindari konflik; sulit asertif." },
  INFP: { nick: "The Healer", desc: "Idealis, reflektif, dan berorientasi nilai personal.", strengths: "Kreatif, empatik, berkomitmen pada makna.", watch: "Rentan overthinking dan menunda keputusan sulit." },
  INTP: { nick: "The Thinker", desc: "Analitis, ingin tahu, menyukai teori dan sistem.", strengths: "Logika tajam, inovatif, independen.", watch: "Kurang tuntas pada eksekusi rutin." },
  ESTP: { nick: "The Dynamo", desc: "Energik, spontan, dan berorientasi hasil cepat.", strengths: "Cepat mengambil tindakan, persuasif.", watch: "Bisa terlalu impulsif; kurang sabar pada detail." },
  ESFP: { nick: "The Performer", desc: "Antusias, sosial, dan menghidupkan suasana tim.", strengths: "Komunikatif, adaptif, membangun rapport.", watch: "Mudah teralihkan dari tugas jangka panjang." },
  ENFP: { nick: "The Champion", desc: "Antusias, kreatif, dan memotivasi orang lain.", strengths: "Ide segar, hangat, fleksibel.", watch: "Sulit fokus pada tugas repetitif." },
  ENTP: { nick: "The Visionary", desc: "Inovator debater yang suka menantang status quo.", strengths: "Cepat belajar, argumentatif konstruktif.", watch: "Bisa memulai banyak hal tanpa menyelesaikan." },
  ESTJ: { nick: "The Supervisor", desc: "Terorganisir, tegas, dan berorientasi pada aturan.", strengths: "Manajerial, efisien, tegas mengambil keputusan.", watch: "Kurang lentur pada pendekatan tidak konvensional." },
  ESFJ: { nick: "The Provider", desc: "Kooperatif, hangat, dan menjaga harmoni tim.", strengths: "Loyal, teliti, service oriented.", watch: "Sensitif terhadap kritik; menghindari konflik." },
  ENFJ: { nick: "The Teacher", desc: "Karismatik, inspiratif, dan mengembangkan orang lain.", strengths: "Komunikator kuat, empatik, visioner.", watch: "Rentan burnout karena mengutamakan orang lain." },
  ENTJ: { nick: "The Commander", desc: "Pemimpin strategis, tegas, dan berorientasi pencapaian.", strengths: "Decisive, organisatoris, driver perubahan.", watch: "Bisa terkesan dominan; kurang sabar pada proses." },
};

const DIM_INFO: Record<"EI" | "SN" | "TF" | "JP", { title: string; poles: Record<string, { name: string; rec: string }> }> = {
  EI: {
    title: "Sumber Energi",
    poles: {
      E: { name: "Extraversion", rec: "Optimal di peran kolaboratif, klien, atau tim lintas fungsi. Alokasikan waktu untuk brainstorming bersama." },
      I: { name: "Introversion", rec: "Optimal di peran analitis dan deep-work. Jadwalkan waktu tenang tanpa interupsi." },
    },
  },
  SN: {
    title: "Cara Mengolah Informasi",
    poles: {
      S: { name: "Sensing", rec: "Andalkan data konkret dan SOP. Libatkan di pekerjaan detail, kontrol kualitas, atau operasional." },
      N: { name: "Intuition", rec: "Andalkan di inisiatif strategis, inovasi, dan pengembangan konsep baru." },
    },
  },
  TF: {
    title: "Cara Mengambil Keputusan",
    poles: {
      T: { name: "Thinking", rec: "Cocok untuk peran yang butuh objektivitas: analisis, audit, kebijakan berbasis logika." },
      F: { name: "Feeling", rec: "Cocok untuk peran people-oriented: HR, layanan, mentoring, dan pengelolaan konflik." },
    },
  },
  JP: {
    title: "Gaya Kerja",
    poles: {
      J: { name: "Judging", rec: "Berikan target dan tenggat jelas; unggul dalam manajemen proyek dan eksekusi terstruktur." },
      P: { name: "Perceiving", rec: "Berikan ruang eksplorasi; unggul di lingkungan agile dan tugas yang berubah cepat." },
    },
  },
};

function clarityLabel(v: number) {
  if (v >= 60) return { text: "Sangat Jelas", cls: "bg-success text-success-foreground" };
  if (v >= 30) return { text: "Jelas", cls: "bg-primary/15 text-primary" };
  if (v >= 10) return { text: "Sedang", cls: "bg-muted text-foreground" };
  return { text: "Tipis", cls: "bg-destructive/15 text-destructive" };
}

function MbtiSummary({ result }: { result: any }) {
  const type: string = result.type;
  const info = MBTI_TYPE_SUMMARY[type];
  const pairs = ["EI", "SN", "TF", "JP"] as const;
  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>
            Tipe MBTI Anda: <span className="text-primary text-2xl font-bold">{type}</span>
            {info && <span className="ml-2 text-sm font-normal text-muted-foreground">— {info.nick}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {info && (
            <div className="rounded-md border bg-muted/30 p-4 text-sm">
              <p className="mb-2">{info.desc}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div><span className="text-xs font-semibold uppercase text-success">Kekuatan</span><div>{info.strengths}</div></div>
                <div><span className="text-xs font-semibold uppercase text-destructive">Perlu diperhatikan</span><div>{info.watch}</div></div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pairs.map((pair) => {
              const [x, y] = pair.split("") as [string, string];
              const cx = result.counts?.[x] ?? 0;
              const cy = result.counts?.[y] ?? 0;
              const dominant = cx >= cy ? x : y;
              const clarity = result.clarity?.[pair] ?? 0;
              const lab = clarityLabel(clarity);
              return (
                <div key={pair} className="rounded border bg-muted/40 p-3 text-center">
                  <div className="text-xs text-muted-foreground">{x} vs {y}</div>
                  <div className="mt-1 text-2xl font-bold text-primary">{dominant}</div>
                  <div className="text-xs">{x}: <b>{cx}</b> · {y}: <b>{cy}</b></div>
                  <div className={`mt-1 inline-block rounded px-2 py-0.5 text-[11px] ${lab.cls}`}>{lab.text} · {clarity}%</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Rekomendasi per Dimensi</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {pairs.map((pair) => {
              const [x, y] = pair.split("") as [string, string];
              const cx = result.counts?.[x] ?? 0;
              const cy = result.counts?.[y] ?? 0;
              const dominant = (cx >= cy ? x : y) as string;
              const dim = DIM_INFO[pair];
              const pole = dim.poles[dominant];
              const clarity = result.clarity?.[pair] ?? 0;
              return (
                <div key={pair} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase text-muted-foreground">{dim.title}</div>
                    <Badge variant="outline">{dominant} · {pole.name}</Badge>
                  </div>
                  <div className="mt-2 text-sm">{pole.rec}</div>
                  <div className="mt-2 text-[11px] text-muted-foreground">Kejelasan preferensi: {clarity}%</div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Catatan: MBTI menggambarkan preferensi, bukan kemampuan. Semakin rendah persentase kejelasan, semakin fleksibel individu menggunakan kedua kutub dimensi tersebut.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
