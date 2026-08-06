import { useMemo } from "react";
import { PAPI_TOP_ORDER, PAPI_BOTTOM_ORDER, papiScore } from "@/lib/papi-key";

type Q = { id: string; question_number?: number | null };

/**
 * Lembar jawaban PAPI Kostick — replika lembar resmi:
 * grid 9 kolom x 10 baris (kolom paling kanan = item 1-10, paling kiri = 81-90),
 * garis putus-putus diagonal menuju 10 skala atas (G L I T V S R D C E) dan
 * 10 skala bawah (N A P X B O Z K F W), garis tebal diagonal sebagai pembatas.
 * Panah ATAS = opsi A, panah BAWAH = opsi B.
 */
export function PapiSheet({
  questions,
  answers,
  onPick,
}: {
  questions: Q[];
  answers: Record<string, string>;
  onPick: (questionId: string, key: string) => void;
}) {
  const byNumber = useMemo(() => {
    const m = new Map<number, Q>();
    questions.forEach((q, i) => m.set(Number(q.question_number ?? i + 1), q));
    return m;
  }, [questions]);

  const picks = useMemo(() => {
    const p: Record<number, string> = {};
    for (const [n, q] of byNumber) {
      const v = (answers[q.id] ?? "").toUpperCase();
      if (v === "A" || v === "B") p[n] = v;
    }
    return p;
  }, [byNumber, answers]);

  const scores = useMemo(() => papiScore(picks), [picks]);

  const cols = [9, 8, 7, 6, 5, 4, 3, 2, 1]; // kiri -> kanan
  const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <div className="rounded-lg border bg-card p-3 shadow-card sm:p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="font-display text-lg font-bold tracking-[0.2em] text-primary">PAPI</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">PA Preference Inventory — Lembar Jawaban</div>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Terisi <b className="text-foreground">{scores.answered}</b>/90 · panah <b className="text-foreground">↑ = A</b>, <b className="text-foreground">↓ = B</b>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[820px] border border-foreground/70 p-3">
          {/* Baris skala atas */}
          <div className="grid grid-cols-[64px_repeat(10,minmax(0,1fr))] items-end gap-x-1">
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground">Total</div>
              <div className="mx-auto flex h-7 w-14 items-center justify-center border border-foreground/70 text-xs font-bold">
                {scores.totalTop}
              </div>
            </div>
            {PAPI_TOP_ORDER.map((s) => (
              <div key={s} className="text-center">
                <div className="text-base font-bold leading-none">{s}</div>
                <div className="mx-auto mt-1 flex h-7 w-8 items-center justify-center border border-foreground/70 text-xs font-semibold">
                  {scores.scales[s] ?? 0}
                </div>
              </div>
            ))}
          </div>

          {/* Grid item */}
          <div className="relative mt-1 grid grid-cols-9">
            {rows.map((row) =>
              cols.map((col) => {
                const n = (col - 1) * 10 + row;
                const q = byNumber.get(n);
                const val = q ? (answers[q.id] ?? "").toUpperCase() : "";
                const onEdge = row === col; // garis tebal pembatas skala atas/bawah
                return (
                  <div
                    key={`${row}-${col}`}
                    className={`relative h-[52px] ${onEdge ? "bg-foreground/[0.03]" : ""}`}
                  >
                    {/* garis panduan diagonal */}
                    <svg
                      className="pointer-events-none absolute inset-0 h-full w-full text-foreground/40"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
                      <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
                      {onEdge && (
                        <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="2" className="text-foreground" vectorEffect="non-scaling-stroke" />
                      )}
                    </svg>

                    <div className="relative flex h-full items-center justify-center gap-1">
                      <span className="w-6 text-right font-mono text-[11px] font-semibold text-foreground">{n}</span>
                      <div className="flex flex-col gap-[2px]">
                        {(["A", "B"] as const).map((k) => {
                          const picked = val === k;
                          return (
                            <button
                              key={k}
                              type="button"
                              disabled={!q}
                              aria-label={`Nomor ${n} pilih ${k}`}
                              aria-pressed={picked}
                              onClick={() => q && onPick(q.id, k)}
                              className={`flex h-[21px] w-8 items-center justify-center rounded-sm border text-[10px] font-bold leading-none transition ${
                                picked
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-input bg-background text-muted-foreground hover:bg-accent"
                              }`}
                            >
                              {k === "A" ? "↑ A" : "↓ B"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }),
            )}
          </div>

          {/* Baris skala bawah */}
          <div className="mt-1 grid grid-cols-[repeat(10,minmax(0,1fr))_64px] items-start gap-x-1">
            {PAPI_BOTTOM_ORDER.map((s) => (
              <div key={s} className="text-center">
                <div className="mx-auto flex h-7 w-8 items-center justify-center border border-foreground/70 text-xs font-semibold">
                  {scores.scales[s] ?? 0}
                </div>
                <div className="mt-1 text-base font-bold leading-none">{s}</div>
              </div>
            ))}
            <div className="text-center">
              <div className="mx-auto flex h-7 w-14 items-center justify-center border border-foreground/70 text-xs font-bold">
                {scores.totalBottom}
              </div>
              <div className="text-[10px] text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Isi dari kolom paling kanan (nomor 1) ke kiri. Setiap nomor pilih satu panah saja: <b className="text-foreground">↑ A</b> (pernyataan atas)
        atau <b className="text-foreground">↓ B</b> (pernyataan bawah). Angka pada kotak skala terisi otomatis dan langsung sesuai format skoring Excel PAPI.
      </p>
    </div>
  );
}
