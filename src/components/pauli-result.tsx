import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Q = { id: string; question_number: number; options: any };

export type PauliColumn = {
  column: number;
  digits: string;
  answer: string;
  cells: Array<{ index: number; key: number; value: string | null; correct: boolean }>;
  filled: number;
  correct: number;
  wrong: number;
  total: number;
};

/** Hitung ulang hasil Pauli dari soal + jawaban kandidat (deret angka, jumlah 2 digit, ambil digit terakhir). */
export function computePauli(questions: Q[], answerOf: (id: string) => string | undefined) {
  const columns: PauliColumn[] = [];
  for (const q of [...questions].sort((a, b) => (a.question_number ?? 0) - (b.question_number ?? 0))) {
    const digits: string = (q.options as any)?.digits ?? "";
    if (!digits) continue;
    const answer = answerOf(q.id) ?? "";
    const chars = answer.split("");
    const cells: PauliColumn["cells"] = [];
    let filled = 0;
    let correct = 0;
    for (let i = 0; i < digits.length - 1; i++) {
      const key = (Number(digits[i]) + Number(digits[i + 1])) % 10;
      const ch = chars[i];
      const value = ch && /\d/.test(ch) ? ch : null;
      const ok = value !== null && Number(value) === key;
      if (value !== null) filled++;
      if (ok) correct++;
      cells.push({ index: i, key, value, correct: ok });
    }
    columns.push({
      column: q.question_number,
      digits,
      answer,
      cells,
      filled,
      correct,
      wrong: filled - correct,
      total: cells.length,
    });
  }
  const filled = columns.reduce((s, c) => s + c.filled, 0);
  const correct = columns.reduce((s, c) => s + c.correct, 0);
  const total = columns.reduce((s, c) => s + c.total, 0);
  const wrong = filled - correct;
  return {
    columns,
    filled,
    correct,
    wrong,
    total,
    unanswered: total - filled,
    accuracy: filled > 0 ? Math.round((correct / filled) * 100) : 0,
    completion: total > 0 ? Math.round((filled / total) * 100) : 0,
  };
}

function Stat({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "success" | "destructive" | "primary" }) {
  const color = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-primary";
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-center">
      <div className={`font-display text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Halaman hasil & lembar jawaban Pauli/Koran untuk Admin & HR. */
export function PauliResult({ questions, answerOf }: { questions: Q[]; answerOf: (id: string) => string | undefined }) {
  const res = useMemo(() => computePauli(questions, answerOf), [questions, answerOf]);
  const [showSheet, setShowSheet] = useState(true);
  const [onlyWorked, setOnlyWorked] = useState(true);

  const cols = onlyWorked ? res.columns.filter((c) => c.filled > 0) : res.columns;

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle>Hasil Skoring Pauli / Koran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <Stat label="Terisi" value={res.filled} hint={`dari ${res.total} soal`} />
            <Stat label="Benar" value={res.correct} tone="success" />
            <Stat label="Salah" value={res.wrong} tone="destructive" />
            <Stat label="Belum diisi" value={res.unanswered} />
            <Stat label="Akurasi" value={`${res.accuracy}%`} hint="benar ÷ terisi" tone="success" />
            <Stat label="Pengerjaan" value={`${res.completion}%`} hint="terisi ÷ total" />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Progres pengerjaan</span>
              <span>{res.filled}/{res.total}</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-muted">
              <div className="h-full bg-primary" style={{ width: `${res.completion}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rekap per kolom</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Kolom</th>
                  <th className="px-3 py-2 text-right">Terisi</th>
                  <th className="px-3 py-2 text-right">Benar</th>
                  <th className="px-3 py-2 text-right">Salah</th>
                  <th className="px-3 py-2 text-right">Akurasi</th>
                </tr>
              </thead>
              <tbody>
                {res.columns.map((c) => (
                  <tr key={c.column} className="border-t">
                    <td className="px-3 py-1.5 font-medium">Kolom {c.column}</td>
                    <td className="px-3 py-1.5 text-right">{c.filled}/{c.total}</td>
                    <td className="px-3 py-1.5 text-right text-success">{c.correct}</td>
                    <td className="px-3 py-1.5 text-right text-destructive">{c.wrong}</td>
                    <td className="px-3 py-1.5 text-right">{c.filled > 0 ? Math.round((c.correct / c.filled) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="text-base">Lembar jawaban</CardTitle>
          <div className="no-print flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setOnlyWorked((v) => !v)}>
              {onlyWorked ? "Tampilkan semua kolom" : "Hanya kolom dikerjakan"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowSheet((v) => !v)}>
              {showSheet ? "Sembunyikan" : "Tampilkan"}
            </Button>
          </div>
        </CardHeader>
        {showSheet && (
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-success/20 ring-1 ring-success" /> Benar</span>
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-destructive/20 ring-1 ring-destructive" /> Salah (kunci ditampilkan)</span>
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-muted ring-1 ring-border" /> Belum diisi</span>
            </div>
            {cols.length === 0 ? (
              <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
                Kandidat belum mengisi jawaban Pauli.
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {cols.map((c) => (
                  <div key={c.column} className="shrink-0">
                    <div className="mb-1 text-center text-[11px] font-semibold text-muted-foreground">
                      K{c.column} · {c.correct}B/{c.wrong}S
                    </div>
                    <div className="rounded border">
                      {c.cells.map((cell) => {
                        const digitTop = c.digits[cell.index];
                        const state = cell.value === null
                          ? "bg-muted/40 text-muted-foreground"
                          : cell.correct
                            ? "bg-success/15 text-success"
                            : "bg-destructive/15 text-destructive";
                        return (
                          <div key={cell.index} className="grid grid-cols-[26px_28px_26px] items-center border-b text-[11px] last:border-b-0">
                            <div className="px-1 text-center font-mono text-muted-foreground">{digitTop}</div>
                            <div className={`px-1 text-center font-mono font-bold ${state}`}>{cell.value ?? "–"}</div>
                            <div className="px-1 text-center font-mono text-[10px] text-muted-foreground">{cell.key}</div>
                          </div>
                        );
                      })}
                      <div className="grid grid-cols-[26px_28px_26px] border-t bg-muted/60 text-[10px] text-muted-foreground">
                        <div className="px-1 text-center">soal</div>
                        <div className="px-1 text-center">jwb</div>
                        <div className="px-1 text-center">kunci</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
