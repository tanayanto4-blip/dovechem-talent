import { useMemo, useRef, useState, useEffect } from "react";

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

const WINDOW_BEFORE = 3;
const WINDOW_AFTER = 5;

export function PauliSheet({
  questions,
  answers,
  onChange,
}: {
  questions: PauliQuestion[];
  answers: Record<string, string>;
  onChange: (questionId: string, value: string) => void;
}) {
  // Cursor = posisi soal aktif (kolom + celah antar dua angka)
  const [col, setCol] = useState(0);
  const [row, setRow] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const q = questions[col];
  const digits = useMemo(() => pauliDigits(q), [q]);
  const gaps = Math.max(digits.length - 1, 0);
  const chars = pauliNormalize(answers[q?.id], gaps);

  const totalGaps = useMemo(
    () => questions.reduce((s, item) => s + Math.max(pauliDigits(item).length - 1, 0), 0),
    [questions],
  );
  const totalFilled = useMemo(
    () => questions.reduce((s, item) => s + pauliFilledCount(answers[item.id]), 0),
    [questions, answers],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, [col, row]);

  function advance() {
    if (row + 1 < gaps) {
      setRow(row + 1);
    } else if (col + 1 < questions.length) {
      setCol(col + 1);
      setRow(0);
    }
  }

  function back() {
    if (row > 0) {
      setRow(row - 1);
    } else if (col > 0) {
      const prev = Math.max(pauliDigits(questions[col - 1]).length - 1, 0);
      setCol(col - 1);
      setRow(Math.max(prev - 1, 0));
    }
  }

  function setChar(raw: string) {
    const v = raw.replace(/\D/g, "").slice(-1);
    const next = [...chars];
    next[row] = v === "" ? "." : v;
    onChange(q.id, next.join(""));
    if (v !== "") advance();
  }

  if (!q) return null;

  const start = Math.max(0, row - WINDOW_BEFORE);
  const end = Math.min(digits.length, row + WINDOW_AFTER + 2);
  const visible: number[] = [];
  for (let i = start; i < end; i++) visible.push(i);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
        <span>
          Deret <b className="text-foreground">{col + 1}</b>/{questions.length} · baris{" "}
          <b className="text-foreground">{row + 1}</b>/{gaps}
        </span>
        <span>
          Terisi <b className="text-foreground">{totalFilled}</b>/{totalGaps}
        </span>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mx-auto grid w-max grid-cols-[auto_auto] items-start gap-x-8">
          <div className="text-center text-[11px] uppercase tracking-widest text-muted-foreground">
            Soal Berderet
          </div>
          <div className="text-center text-[11px] uppercase tracking-widest text-muted-foreground">
            Jawaban
          </div>

          <div className="mt-2 border-x border-t border-foreground/70">
            {visible.map((i) => {
              const isPair = i === row || i === row + 1;
              return (
                <div
                  key={i}
                  className={`grid h-11 w-14 place-items-center border-b border-foreground/70 font-mono text-lg font-semibold transition-colors ${
                    isPair ? "bg-primary/10 text-primary" : "text-foreground"
                  }`}
                >
                  {digits[i]}
                </div>
              );
            })}
          </div>

          <div className="mt-2">
            {visible.map((i) => {
              if (i >= gaps) return <div key={i} className="h-11" />;
              const active = i === row;
              const val = chars[i] === "." ? "" : chars[i];
              return (
                <div key={i} className="flex h-11 items-center" style={{ transform: "translateY(1.375rem)" }}>
                  {active ? (
                    <input
                      ref={inputRef}
                      inputMode="numeric"
                      autoFocus
                      maxLength={1}
                      value={val}
                      onChange={(e) => setChar(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && val === "") {
                          e.preventDefault();
                          back();
                        }
                        if (e.key === "ArrowUp") { e.preventDefault(); back(); }
                        if (e.key === "ArrowDown" || e.key === "Enter") { e.preventDefault(); advance(); }
                      }}
                      aria-label={`Jawaban baris ${i + 1} deret ${col + 1}`}
                      className="h-9 w-11 rounded-md border-2 border-primary bg-primary/5 text-center font-mono text-base font-bold text-primary outline-none"
                    />
                  ) : (
                    <div className="grid h-9 w-11 place-items-center font-mono text-base font-semibold text-muted-foreground">
                      {val}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Jumlahkan dua angka yang bersebelahan, tulis <b>angka terakhir</b> hasilnya. Contoh: 7 + 8 = 15
          → tulis <b>5</b>. Setelah menjawab, lembar bergeser otomatis ke soal berikutnya.
        </p>
      </div>
    </div>
  );
}
