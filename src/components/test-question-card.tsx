import { memo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { PauliQuestion } from "./pauli-sheet";

export type Question = {
  id: string;
  question_number: number;
  question_text?: string | null;
  options?: any[];
  dimension?: string | null;
};

type TestType = "mcq" | "disc" | "kraepelin" | "mbti" | "eq" | "wpt" | "papi" | "pauli" | "ishihara";

export interface TestQuestionCardProps {
  q: Question;
  index: number;
  total: number;
  testType: TestType;
  answer: string;
  discPick?: { most?: string; least?: string };
  wptImage?: { url: string; caption: string } | null;
  onPickMcq: (qid: string, key: string) => void;
  onSetDisc: (qid: string, kind: "most" | "least", key: string) => void;
  onChangeText: (qid: string, value: string) => void;
}

function WptImageFigure({ url, caption, number }: { url: string; caption: string; number: number }) {
  return (
    <figure className="mt-3 w-full overflow-hidden rounded-md border bg-white p-2 sm:p-3">
      <img
        src={url}
        alt={`Ilustrasi soal nomor ${number}`}
        className="mx-auto block h-auto w-full max-w-full object-contain sm:max-h-[60vh] sm:w-auto"
        loading="lazy"
      />
      <figcaption className="mt-2 text-center text-[11px] leading-snug text-muted-foreground sm:text-xs">
        {caption} · <span className="font-medium">Klik gambar untuk memperbesar</span>
      </figcaption>
    </figure>
  );
}

export const TestQuestionCard = memo(function TestQuestionCard({
  q,
  index,
  total,
  testType,
  answer,
  discPick,
  wptImage,
  onPickMcq,
  onSetDisc,
  onChangeText,
}: TestQuestionCardProps) {
  const handleMcq = useCallback((key: string) => onPickMcq(q.id, key), [onPickMcq, q.id]);
  const handleDiscMost = useCallback((key: string) => onSetDisc(q.id, "most", key), [onSetDisc, q.id]);
  const handleDiscLeast = useCallback((key: string) => onSetDisc(q.id, "least", key), [onSetDisc, q.id]);
  const handleText = useCallback((v: string) => onChangeText(q.id, v), [onChangeText, q.id]);

  const isDisc = testType === "disc";
  const isMbti = testType === "mbti";
  const isEq = testType === "eq";
  const isWpt = testType === "wpt";
  const isPapi = testType === "papi";
  const isKraepelin = testType === "kraepelin";
  const isIshihara = testType === "ishihara";

  return (
    <Card className="shadow-card">
      <CardContent className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-widest text-secondary">
            {isDisc ? `Kelompok ${index + 1} dari ${total}` : `Soal ${index + 1}`}
          </div>
          {isDisc && (
            <div className="text-[11px] text-muted-foreground">
              {discPick?.most && discPick?.least ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">✓ Terisi</span>
              ) : (
                <span>Pilih 1 M &amp; 1 L</span>
              )}
            </div>
          )}
        </div>
        {!isDisc && !isMbti && !isPapi && <div className="text-base font-medium">{q.question_text}</div>}
        {isWpt && wptImage && <WptImageFigure url={wptImage.url} caption={wptImage.caption} number={q.question_number} />}

        {isIshihara ? (
          <div className="mt-3 space-y-3">
            {wptImage && (
              <figure className="w-full overflow-hidden rounded-md border bg-white p-2 sm:p-3">
                <img
                  src={wptImage.url}
                  alt={`Lembar warna soal nomor ${q.question_number}`}
                  className="mx-auto block h-auto w-full max-w-[420px] object-contain"
                  loading="lazy"
                />
              </figure>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-xs text-muted-foreground">Tulis jawaban Anda</span>
              <Input
                value={answer}
                onChange={(e) => handleText(e.target.value)}
                placeholder="_____"
                maxLength={30}
                className="h-9 w-40 text-center font-mono"
                aria-label={`Jawaban soal ${index + 1}`}
              />
            </div>
          </div>
        ) : isPapi ? (
          <div className="overflow-hidden rounded-md border bg-card">
            {(q.options ?? []).slice(0, 2).map((opt: any, oi: number) => {
              const picked = answer === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleMcq(opt.key)}
                  aria-pressed={picked}
                  className={`flex w-full items-center gap-3 px-3 sm:px-4 py-3 text-left transition ${oi === 0 ? "border-b" : ""} ${
                    picked ? "bg-primary/10" : "hover:bg-accent"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                      picked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-muted-foreground"
                    }`}
                  >
                    {opt.key}
                  </span>
                  <span className="min-w-0 break-words text-[13px] sm:text-sm leading-snug">{opt.label}</span>
                </button>
              );
            })}
            <div className="border-t bg-muted/40 px-3 sm:px-4 py-2 text-[11px] text-muted-foreground">
              Pilih salah satu saja — A (atas) atau B (bawah).
            </div>
          </div>
        ) : isMbti ? (
          <div className="rounded-md border bg-card">
            {q.question_text && (
              <div className="border-b bg-muted/40 px-3 sm:px-4 py-2 text-sm font-medium">{q.question_text}</div>
            )}
            <div className="grid grid-cols-[1fr_3rem_3rem_1fr] items-stretch">
              {(() => {
                const opts = q.options ?? [];
                const a = opts[0];
                const b = opts[1];
                if (!a || !b) return null;
                const picked = answer;
                const setVal = (key: string, v: string) => {
                  if (v.trim() === "1") handleMcq(key);
                  else if (picked === key) {
                    handleText("");
                  }
                };
                const Cell = ({ opt, side }: { opt: any; side: "left" | "right" }) => {
                  const isPicked = picked === opt.key;
                  return (
                    <>
                      {side === "left" && (
                        <button
                          type="button"
                          onClick={() => handleMcq(opt.key)}
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
                          onClick={() => handleMcq(opt.key)}
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
            <Input
              inputMode="numeric"
              value={answer}
              onChange={(e) => handleText(e.target.value)}
              className="mt-1"
            />
          </div>
        ) : isDisc ? (
          <div className="overflow-hidden rounded-md border bg-card">
            <div className="grid grid-cols-[minmax(0,1fr)_3rem_3rem] sm:grid-cols-[minmax(0,1fr)_4rem_4rem] items-center border-b bg-muted/40 px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Pernyataan</span>
              <span className="text-center text-primary">M</span>
              <span className="text-center text-destructive">L</span>
            </div>
            <div className="divide-y">
              {(q.options ?? []).map((opt: any) => {
                const pick = discPick ?? {};
                const isMost = pick.most === opt.key;
                const isLeast = pick.least === opt.key;
                return (
                  <div
                    key={opt.key}
                    className="grid grid-cols-[minmax(0,1fr)_3rem_3rem] sm:grid-cols-[minmax(0,1fr)_4rem_4rem] items-stretch"
                  >
                    <div className="min-w-0 break-words px-3 sm:px-4 py-3 text-[13px] sm:text-sm leading-snug">
                      {opt.label}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDiscMost(opt.key)}
                      aria-label={`Paling menggambarkan: ${opt.label}`}
                      className={`border-l text-xs font-bold transition ${
                        isMost
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      {isMost ? "M" : "·"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDiscLeast(opt.key)}
                      aria-label={`Paling tidak menggambarkan: ${opt.label}`}
                      className={`border-l text-xs font-bold transition ${
                        isLeast
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-background text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      }`}
                    >
                      {isLeast ? "L" : "·"}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 border-t bg-muted/40 px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] text-muted-foreground">
              <span><b className="text-primary">M</b> (kolom kiri) = Paling menggambarkan diri Anda</span>
              <span><b className="text-destructive">L</b> (kolom kanan) = Paling tidak menggambarkan</span>
            </div>
          </div>
        ) : isEq ? (
          <div className="mt-4">
            <div className="grid grid-cols-5 gap-2">
              {(q.options ?? []).map((opt: any) => {
                const picked = answer === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleMcq(opt.key)}
                    aria-label={opt.label}
                    className={`flex flex-col items-center justify-center rounded-md border px-2 py-3 text-center transition ${
                      picked
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-input bg-background text-muted-foreground hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    <span className="text-lg font-bold">{opt.key}</span>
                    <span className={`mt-0.5 text-[10px] leading-tight ${picked ? "text-primary-foreground/90" : ""}`}>
                      {opt.label.replace(/^\d+\s*[—-]\s*/, "")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : isWpt ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">Tulis jawaban di sini</span>
            <div className="flex items-center gap-1 font-mono text-lg">
              <span className="text-muted-foreground">(</span>
              <Input
                value={answer}
                onChange={(e) => handleText(e.target.value)}
                placeholder="_____"
                maxLength={60}
                className="h-9 w-40 text-center font-mono"
                aria-label={`Jawaban soal ${index + 1}`}
              />
              <span className="text-muted-foreground">)</span>
            </div>
          </div>
        ) : (
          <RadioGroup className="mt-4 space-y-2" value={answer} onValueChange={(v) => handleMcq(v)}>
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
  );
});
