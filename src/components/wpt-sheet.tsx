import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type WptQuestion = {
  id: string;
  question_number: number;
  question_text?: string | null;
};

type Props = {
  questions: WptQuestion[];
  answers: Record<string, string>;
  images: Record<number, { url: string; caption: string }>;
  onChange: (qid: string, value: string) => void;
  renderImage?: (img: { url: string; caption: string }, number: number) => React.ReactNode;
};

/** Pisahkan teks soal dari opsi inline berformat "1. xxx  2. yyy" */
export function parseWptOptions(text: string): { stem: string; options: { key: string; label: string }[] } {
  const raw = text ?? "";
  const firstIdx = raw.search(/(^|\s)1\.\s+\S/);
  if (firstIdx === -1) return { stem: raw, options: [] };
  const stem = raw.slice(0, firstIdx).trim();
  const rest = raw.slice(firstIdx);
  const matches = [...rest.matchAll(/(\d)\.\s*([^0-9]*?)(?=\s+\d\.\s|$)/g)];
  const options = matches
    .map((m) => ({ key: m[1], label: (m[2] ?? "").replace(/[?\s]+$/, "").trim() }))
    .filter((o) => o.label.length > 0);
  if (options.length < 2) return { stem: raw, options: [] };
  return { stem: stem || raw, options };
}

export function WptSheet({ questions, answers, images, onChange, renderImage }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...questions].sort((a, b) => a.question_number - b.question_number),
    [questions],
  );

  const active = activeIdx === null ? null : sorted[activeIdx];
  const parsed = active ? parseWptOptions(active.question_text ?? "") : null;
  const activeAnswer = active ? (answers[active.id] ?? "") : "";
  const img = active ? images[active.question_number] : undefined;

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardContent className="space-y-3 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-primary">Kotak Nomor Soal</div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded-sm bg-success" /> Sudah diisi
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded-sm bg-destructive" /> Belum diisi
              </span>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
            {sorted.map((q, i) => {
              const filled = (answers[q.id] ?? "").trim() !== "";
              const isActive = activeIdx === i;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setActiveIdx(isActive ? null : i)}
                  aria-label={`Soal nomor ${q.question_number}${filled ? " (sudah diisi)" : " (belum diisi)"}`}
                  aria-pressed={isActive}
                  className={`flex h-10 items-center justify-center rounded-md border text-sm font-bold transition ${
                    filled
                      ? "border-success bg-success text-success-foreground"
                      : "border-destructive bg-destructive text-destructive-foreground"
                  } ${isActive ? "ring-2 ring-primary ring-offset-2" : "hover:opacity-85"}`}
                >
                  {q.question_number}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Klik salah satu kotak nomor untuk menampilkan soalnya. Kotak berubah hijau setelah jawaban terisi.
          </p>
        </CardContent>
      </Card>

      {active && parsed && (
        <Card className="border-primary/30 shadow-card">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                  {active.question_number}
                </span>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Soal {active.question_number} dari {sorted.length}
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  disabled={activeIdx === 0}
                  onClick={() => setActiveIdx((v) => Math.max(0, (v ?? 0) - 1))}
                  aria-label="Soal sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  disabled={activeIdx === sorted.length - 1}
                  onClick={() => setActiveIdx((v) => Math.min(sorted.length - 1, (v ?? 0) + 1))}
                  aria-label="Soal berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="text-base font-medium leading-snug">{parsed.stem}</div>

            {img && renderImage?.(img, active.question_number)}

            {parsed.options.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {parsed.options.map((opt) => {
                  const picked = activeAnswer === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => onChange(active.id, picked ? "" : opt.key)}
                      aria-pressed={picked}
                      className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition ${
                        picked ? "border-primary bg-primary/10" : "hover:bg-accent"
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
                      <span className="min-w-0 break-words">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1">
                <label htmlFor={`wpt-${active.id}`} className="text-xs text-muted-foreground">
                  Tulis jawaban Anda sendiri
                </label>
                <Input
                  id={`wpt-${active.id}`}
                  value={activeAnswer}
                  onChange={(e) => onChange(active.id, e.target.value)}
                  placeholder="Ketik jawaban di sini"
                  maxLength={60}
                  className="max-w-sm"
                />
              </div>
            )}

            {parsed.options.length > 0 && (
              <div className="space-y-1">
                <label htmlFor={`wpt-other-${active.id}`} className="text-xs text-muted-foreground">
                  Atau isi jawaban sendiri (bila jawaban Anda tidak ada pada pilihan)
                </label>
                <Input
                  id={`wpt-other-${active.id}`}
                  value={parsed.options.some((o) => o.key === activeAnswer) ? "" : activeAnswer}
                  onChange={(e) => onChange(active.id, e.target.value)}
                  placeholder="Jawaban isian bebas"
                  maxLength={60}
                  className="max-w-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
