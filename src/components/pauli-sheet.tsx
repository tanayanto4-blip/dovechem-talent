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

  const top = digits[row];
  const bottom = digits[row + 1];
  const val = chars[row] === "." ? "" : chars[row];

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

      <div className="rounded-lg border bg-card p-6">
        <div className="mx-auto flex w-max items-center gap-4">
          <div className="border border-foreground/70">
            <div className="grid h-9 w-9 place-items-center border-b border-foreground/70 font-mono text-base font-semibold">
              {top}
            </div>
            <div className="grid h-9 w-9 place-items-center font-mono text-base font-semibold">
              {bottom}
            </div>
          </div>

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
            aria-label={`Jawaban baris ${row + 1} deret ${col + 1}`}
            className="h-8 w-8 rounded border-2 border-primary bg-primary/5 text-center font-mono text-sm font-bold text-primary outline-none"
          />
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Jumlahkan dua angka pada kotak, tulis <b>angka terakhir</b> hasilnya. Contoh: 7 + 8 = 15 → tulis{" "}
          <b>5</b>. Setelah menjawab, otomatis bergeser ke pasangan berikutnya.
        </p>
      </div>
    </div>
  );
}

