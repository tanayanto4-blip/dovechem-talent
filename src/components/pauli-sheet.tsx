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




export function PauliSheet({
  questions,
  answers,
  onChange,
  showGuide = false,
}: {
  questions: PauliQuestion[];
  answers: Record<string, string>;
  onChange: (questionId: string, value: string) => void;
  /** Tampilkan status deret/baris & petunjuk (hanya untuk halaman latihan). */
  showGuide?: boolean;
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
  // Memoize per-question filled counts so we only recompute the changed column.
  const filledPerQuestion = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of questions) {
      map[item.id] = pauliFilledCount(answers[item.id]);
    }
    return map;
  }, [questions, answers]);
  const totalFilled = useMemo(() => Object.values(filledPerQuestion).reduce((s, n) => s + n, 0), [filledPerQuestion]);

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

  if (!q || gaps === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        Deret angka belum tersedia untuk tes ini.
      </div>
    );
  }

  const top = digits[row];
  const bottom = digits[row + 1];
  const val = chars[row] === "." ? "" : chars[row];
  const prevAnswer = row > 0 ? (chars[row - 1] === "." ? "" : chars[row - 1]) : "";

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

      <div
        className="rounded-lg border bg-card p-8"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="mx-auto flex w-max items-start gap-4">
          {/* kolom angka */}
          <div className="flex flex-col items-center">
            <div className="grid h-7 w-9 place-items-center font-mono text-sm text-muted-foreground/40">
              {row > 0 ? digits[row - 1] : ""}
            </div>
            <div className="border-2 border-foreground">
              <div className="grid h-9 w-9 place-items-center border-b-2 border-foreground font-mono text-base font-bold">
                {top}
              </div>
              <div className="grid h-9 w-9 place-items-center font-mono text-base font-bold">
                {bottom}
              </div>
            </div>
            <div className="grid h-7 w-9 place-items-center font-mono text-sm text-muted-foreground/40">
              {digits[row + 2] ?? ""}
            </div>
          </div>

          {/* kolom jawaban, sejajar celah antar dua angka */}
          <div className="flex flex-col items-center">
            <div className="grid h-7 w-9 place-items-center font-mono text-xs text-muted-foreground/40">
              {prevAnswer}
            </div>
            <div className="flex h-[72px] items-center">
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
                className="h-9 w-9 rounded border-2 border-primary bg-primary/5 text-center font-mono text-base font-bold text-primary outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="h-7" />
          </div>
        </div>

        {showGuide && (
          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            Jumlahkan dua angka pada kotak, tulis <b>angka terakhir</b> hasilnya. Contoh: 7 + 8 = 15 → tulis{" "}
            <b>5</b>. Setelah menjawab, otomatis bergeser ke pasangan berikutnya.
          </p>
        )}

      </div>
    </div>
  );
}

