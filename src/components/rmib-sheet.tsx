import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import {
  RMIB_GROUPS,
  parseRmibAnswer,
  parseRmibSides,
  serializeRmibAnswer,
  rmibGroupComplete,
  rmibDuplicates,
  type RmibJob,
  type RmibSide,
} from "@/lib/rmib-key";

export type RmibQuestion = {
  id: string;
  question_number: number;
  question_text?: string | null;
  options?: { jobs?: RmibJob[]; code?: string } | null;
};

export function rmibFilledCount(value: string | undefined | null): number {
  return parseRmibAnswer(value).filter((v) => v !== null).length;
}

function jobsFor(q: RmibQuestion, groupIndex: number): RmibJob[] {
  const fromDb = q.options?.jobs;
  if (Array.isArray(fromDb) && fromDb.length === 12) return fromDb as RmibJob[];
  return RMIB_GROUPS[groupIndex]?.jobs ?? [];
}

export function RmibSheet({
  questions,
  answers,
  gender,
  onChange,
}: {
  questions: RmibQuestion[];
  answers: Record<string, string>;
  gender?: string | null;
  onChange: (questionId: string, value: string) => void;
}) {
  const ordered = useMemo(
    () => [...questions].sort((a, b) => a.question_number - b.question_number),
    [questions],
  );
  const [slide, setSlide] = useState(0);
  const q = ordered[Math.min(slide, ordered.length - 1)];
  if (!q) return null;

  const groupIndex = Math.max(0, q.question_number - 1);
  const group = RMIB_GROUPS[groupIndex];
  const code = q.options?.code ?? group?.code ?? String(q.question_number);
  const jobs = jobsFor(q, groupIndex);
  const defaultSide: RmibSide = String(gender ?? "")
    .toLowerCase()
    .startsWith("p")
    ? "F"
    : "M";

  const value = answers[q.id] ?? "";
  const values = parseRmibAnswer(value);
  const sides = parseRmibSides(value);
  const dups = rmibDuplicates(value);
  const done = rmibGroupComplete(value);

  const setSide = (row: number, side: RmibSide) => {
    const next = [...sides];
    next[row] = side;
    onChange(q.id, serializeRmibAnswer(values, next));
  };

  const setAt = (row: number, raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 2);
    const n = parseInt(digits, 10);
    const next = [...values];
    next[row] = digits === "" ? null : Number.isFinite(n) && n >= 1 && n <= 12 ? n : null;
    onChange(q.id, serializeRmibAnswer(next, sides));
  };

  const missingSideCount = values.filter(
    (v, i) => v !== null && sides[i] !== "M" && sides[i] !== "F",
  ).length;

  return (
    <div className="space-y-3">
      {ordered.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {ordered.map((item, i) => {
            const filled = rmibGroupComplete(answers[item.id]);
            const active = i === slide;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSlide(i)}
                className={`h-9 min-w-9 rounded-md border px-2 text-xs font-bold transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : filled
                      ? "border-success/50 bg-success/10 text-success"
                      : "bg-background text-muted-foreground hover:bg-accent"
                }`}
                aria-label={`Kelompok ${RMIB_GROUPS[item.question_number - 1]?.code ?? i + 1}`}
              >
                {RMIB_GROUPS[item.question_number - 1]?.code ?? i + 1}
              </button>
            );
          })}
        </div>
      )}

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 sm:px-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-secondary">
              Kelompok {code}
              {ordered.length > 1 ? ` — ${slide + 1}/${ordered.length}` : ""}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Ketuk <b>Laki-laki</b> atau <b>Perempuan</b>, lalu ketik peringkat 1–12 di tengah
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="border-b bg-background text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
                  <th className="w-10 border-r px-2 py-2 text-center font-semibold">No</th>
                  <th className="border-r px-3 py-2 text-center font-semibold">Laki-laki</th>
                  <th className="w-20 border-r px-2 py-2 text-center font-semibold">Jawaban</th>
                  <th className="px-3 py-2 text-center font-semibold">Perempuan</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {jobs.map((job, i) => {
                  const v = values[i];
                  const side = sides[i];
                  const dup = v !== null && dups.has(v);
                  const selectedLabel = side === "M" ? job.male : side === "F" ? job.female : null;
                  return (
                    <tr key={i} className="align-middle">
                      <td className="border-r px-2 py-2 text-center text-xs text-muted-foreground">
                        {i + 1}
                      </td>
                      <td
                        role="button"
                        tabIndex={0}
                        onClick={() => setSide(i, "M")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") setSide(i, "M");
                        }}
                        className={`border-r px-3 py-2 text-[13px] leading-snug sm:text-sm cursor-pointer transition ${
                          side === "M"
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-foreground hover:bg-accent/50"
                        }`}
                        aria-label={`Pilih pekerjaan laki-laki: ${job.male}`}
                        aria-pressed={side === "M"}
                      >
                        {job.male}
                      </td>
                      <td className="border-r px-2 py-1.5 text-center">
                        <Input
                          inputMode="numeric"
                          value={v === null ? "" : String(v)}
                          onChange={(e) => setAt(i, e.target.value)}
                          placeholder={side ? "_" : "pilih"}
                          disabled={side !== "M" && side !== "F"}
                          aria-label={
                            selectedLabel
                              ? `Peringkat untuk ${selectedLabel}`
                              : `Pilih pekerjaan laki-laki atau perempuan baris ${i + 1} terlebih dahulu`
                          }
                          className={`mx-auto h-10 w-14 px-0 text-center font-bold ${
                            dup ? "border-destructive text-destructive" : ""
                          }`}
                        />
                      </td>
                      <td
                        role="button"
                        tabIndex={0}
                        onClick={() => setSide(i, "F")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") setSide(i, "F");
                        }}
                        className={`px-3 py-2 text-[13px] leading-snug sm:text-sm cursor-pointer transition ${
                          side === "F"
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-foreground hover:bg-accent/50"
                        }`}
                        aria-label={`Pilih pekerjaan perempuan: ${job.female}`}
                        aria-pressed={side === "F"}
                      >
                        {job.female}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/40 px-3 py-2 text-[11px] sm:px-4">
            {dups.size > 0 ? (
              <span className="inline-flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> Angka {[...dups].join(", ")} dipakai lebih
                dari sekali
              </span>
            ) : done ? (
              <span className="inline-flex items-center gap-1 text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Kelompok {code} lengkap
              </span>
            ) : (
              <span className="text-muted-foreground">
                Terisi {rmibFilledCount(value)}/12 — pilih kolom laki-laki/perempuan lalu isi
                peringkat
              </span>
            )}

            {ordered.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={slide === 0}
                  onClick={() => setSlide((s) => Math.max(0, s - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Sebelumnya
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={slide >= ordered.length - 1}
                  onClick={() => setSlide((s) => Math.min(ordered.length - 1, s + 1))}
                >
                  Berikutnya <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {missingSideCount > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          <AlertCircle className="mb-1 inline h-4 w-4 text-warning" /> <b>{missingSideCount}</b>{" "}
          baris sudah diisi angka tetapi belum memilih kolom Laki-laki atau Perempuan. Ketuk salah
          satu kolom di setiap baris.
        </div>
      )}
    </div>
  );
}
