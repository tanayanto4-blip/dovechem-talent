import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type PauliQuestion = { id: string; question_number: number; options: any };

export function pauliDigits(q: PauliQuestion): string[] {
  const raw = (q?.options as any)?.digits;
  return typeof raw === "string" ? raw.split("") : [];
}

/** Answers are stored as a fixed-length string, one char per box gap; "." = kosong. */
export function pauliNormalize(value: string | undefined, len: number) {
  const base = (value ?? "").padEnd(len, ".").slice(0, len);
  return base.split("");
}

export function pauliFilledCount(value: string | undefined) {
  return (value ?? "").split("").filter((c) => /\d/.test(c)).length;
}

export function PauliSheet({
  questions,
  answers,
  onChange,
}: {
  questions: PauliQuestion[];
  answers: Record<string, string>;
  onChange: (questionId: string, value: string) => void;
}) {
  const [col, setCol] = useState(0);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const q = questions[col];
  const digits = useMemo(() => pauliDigits(q), [q]);
  const gaps = Math.max(digits.length - 1, 0);
  const chars = pauliNormalize(answers[q?.id], gaps);
  const filled = chars.filter((c) => /\d/.test(c)).length;

  function setChar(i: number, raw: string) {
    const v = raw.replace(/\D/g, "").slice(-1);
    const next = [...chars];
    next[i] = v === "" ? "." : v;
    onChange(q.id, next.join(""));
    if (v !== "") inputsRef.current[i + 1]?.focus();
  }

  if (!q) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={col === 0}
            onClick={() => setCol((c) => Math.max(0, c - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Kolom sebelumnya
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={col >= questions.length - 1}
            onClick={() => setCol((c) => Math.min(questions.length - 1, c + 1))}
          >
            Kolom berikutnya <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          Kolom <b className="text-foreground">{col + 1}</b> dari {questions.length} · terisi{" "}
          <b className="text-foreground">{filled}</b>/{gaps}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-lg border bg-muted/30 p-3">
        {questions.map((item, i) => {
          const done = pauliFilledCount(answers[item.id]);
          const active = i === col;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCol(i)}
              className={`h-7 w-9 rounded border text-[11px] font-semibold transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : done > 0
                    ? "border-success bg-success/10 text-success"
                    : "border-input bg-background text-muted-foreground hover:border-primary/40"
              }`}
              aria-label={`Buka kolom ${i + 1}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 text-center text-xs uppercase tracking-widest text-muted-foreground">
          Lembar Jawaban — Kolom {col + 1}
        </div>
        <div className="mx-auto w-max">
          {digits.map((d, i) => (
            <div key={i} className="relative flex h-9 items-center">
              <div className="grid h-9 w-11 place-items-center border border-input bg-background font-mono text-base font-semibold">
                {d}
              </div>
              {i < gaps && (
                <input
                  ref={(el) => { inputsRef.current[i] = el; }}
                  inputMode="numeric"
                  maxLength={1}
                  value={chars[i] === "." ? "" : chars[i]}
                  onChange={(e) => setChar(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && (chars[i] === "." || chars[i] === "")) {
                      inputsRef.current[i - 1]?.focus();
                    }
                    if (e.key === "ArrowUp") { e.preventDefault(); inputsRef.current[i - 1]?.focus(); }
                    if (e.key === "ArrowDown") { e.preventDefault(); inputsRef.current[i + 1]?.focus(); }
                  }}
                  aria-label={`Hasil penjumlahan angka ke-${i + 1} dan ke-${i + 2} kolom ${col + 1}`}
                  className="absolute left-[3.25rem] top-[1.125rem] h-8 w-10 rounded border border-dashed border-primary/50 bg-primary/5 text-center font-mono text-sm font-bold text-primary outline-none focus:border-primary focus:bg-primary/10"
                />
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Jumlahkan dua angka yang bersebelahan (atas + bawah), tulis <b>angka terakhir</b> hasilnya
          pada kotak putus-putus di samping. Contoh: 7 + 8 = 15 → tulis <b>5</b>.
        </p>
      </div>
    </div>
  );
}
