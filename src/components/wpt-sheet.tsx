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

/** Buang penanda gambar [IMG:...] dari teks soal */
export function stripImgToken(text: string): string {
  return (text ?? "").replace(/\[IMG:[^\]]*\]/g, "").trim();
}

/**
 * Pisahkan blok data berturut ke bawah (mis. pasangan "84721 / 84721") dari teks soal.
 * Blok dipisah oleh 2+ spasi dan setiap barisnya memuat tanda "/".
 */
export function extractPairBlock(text: string): { body: string; lines: string[] } {
  const segments = (text ?? "").split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
  const pairIdx = segments.findIndex((s) => /^[^/]+\/[^/]+$/.test(s));
  if (pairIdx === -1) return { body: text, lines: [] };
  const lines = segments.slice(pairIdx).filter((s) => /^[^/]+\/[^/]+$/.test(s));
  if (lines.length < 1) return { body: text, lines: [] };
  return { body: segments.slice(0, pairIdx).join(" "), lines };
}

const isNumToken = (s: string) => /^[-+]?[\d.,/]*\d[\d.,/]*[?.]?$|^\?$/.test(s);

/** Deret angka bersampingan, mis. "1   .5   .25   .125   ?" atau "8, 4, 2, 1, 1/2, ?" */
export function extractSeriesBlock(text: string): { body: string; items: string[] } {
  const segments = (text ?? "").split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
  const startIdx = segments.findIndex((s, i) => isNumToken(s) && segments.slice(i).every(isNumToken));
  if (startIdx !== -1) {
    const items = segments.slice(startIdx);
    if (items.length >= 3) return { body: segments.slice(0, startIdx).join(" "), items };
  }
  // Deret dipisah koma di akhir kalimat: "... muncul?  8, 4, 2, 1, 1/2, 1/4, ?"
  const tail = segments[segments.length - 1] ?? "";
  const commaIdx = tail.search(/(?:(?<=\?|:)\s+)[\d.]/);
  const head = commaIdx === -1 ? "" : tail.slice(0, commaIdx).trim();
  const listPart = commaIdx === -1 ? tail : tail.slice(commaIdx).trim();
  const parts = listPart.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 3 && parts.every(isNumToken)) {
    const body = [...segments.slice(0, -1), head].filter(Boolean).join(" ");
    return { body, items: parts };
  }
  return { body: text, items: [] };
}

/** Blok pernyataan dalam tanda kutip -> tiap kalimat satu baris ke bawah */
export function extractQuoteBlock(text: string): { body: string; lines: string[] } {
  const m = (text ?? "").match(/"([^"]+)"/);
  if (!m) return { body: text, lines: [] };
  const lines = m[1]
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length === 0) return { body: text, lines: [] };
  return { body: (text ?? "").replace(m[0], "").replace(/\s{2,}/g, " ").trim(), lines };
}

/** Gabungan semua blok tampilan khusus WPT */
export function extractWptBlocks(stem: string) {
  const empty = { pairs: [] as string[], series: [] as string[], quote: [] as string[] };
  const pair = extractPairBlock(stem);
  if (pair.lines.length > 0) return { ...empty, body: pair.body, pairs: pair.lines };
  const series = extractSeriesBlock(stem);
  if (series.items.length > 0) return { ...empty, body: series.body, series: series.items };
  const quote = extractQuoteBlock(stem);
  if (quote.lines.length > 0) return { ...empty, body: quote.body, quote: quote.lines };
  return { ...empty, body: stem };
}


/** Pisahkan teks soal dari opsi inline berformat "1. xxx  2. yyy" atau "a. xxx  b. yyy" */
export function parseWptOptions(text: string): { stem: string; options: { key: string; label: string }[] } {
  const cleaned = stripImgToken(text ?? "");
  // Blok kutipan dipisahkan dulu agar tidak ikut terparsing sebagai opsi
  const quoteMatch = cleaned.match(/"[^"]+"/);
  const raw = quoteMatch ? cleaned.replace(quoteMatch[0], "").replace(/\s{2,}/g, "  ").trim() : cleaned;
  const withQuote = (s: string) => (quoteMatch ? `${s}  ${quoteMatch[0]}`.trim() : s);

  // 1) Opsi berupa angka: "1. xxx  2. yyy"
  const numIdx = raw.search(/(^|\s)1[.)]\s+\S/);
  if (numIdx !== -1) {
    const stem = raw.slice(0, numIdx).trim();
    const rest = raw.slice(numIdx);
    const matches = [...rest.matchAll(/(\d)[.)]\s*([^0-9]*?)(?=\s+\d[.)]\s|$)/g)];
    const options = matches
      .map((m) => ({ key: m[1], label: (m[2] ?? "").replace(/[?\s]+$/, "").trim() }))
      .filter((o) => o.label.length > 0);
    if (options.length >= 2) return { stem: withQuote(stem || raw), options };
  }

  // 2) Opsi berupa huruf: "a. xxx  b. yyy" / "A) xxx  B) yyy"
  const letIdx = raw.search(/(^|\s)[aA][.)]\s+\S/);
  if (letIdx !== -1) {
    const stem = raw.slice(0, letIdx).trim();
    const rest = raw.slice(letIdx);
    const matches = [...rest.matchAll(/([a-eA-E])[.)]\s*(.*?)(?=\s+[a-eA-E][.)]\s|$)/g)];
    const options = matches
      .map((m) => ({ key: m[1].toUpperCase(), label: (m[2] ?? "").replace(/[?\s]+$/, "").trim() }))
      .filter((o) => o.label.length > 0);
    if (options.length >= 2) return { stem: withQuote(stem || raw), options };
  }

  return { stem: withQuote(raw), options: [] };
}



export function WptSheet({ questions, answers, images, onChange, renderImage }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...questions].sort((a, b) => a.question_number - b.question_number),
    [questions],
  );

  const active = activeIdx === null ? null : sorted[activeIdx];
  const parsed = active ? parseWptOptions(active.question_text ?? "") : null;
  const block = parsed

    ? extractWptBlocks(parsed.stem)
    : { body: "", pairs: [] as string[], series: [] as string[], quote: [] as string[] };

  
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

            <div className="text-base font-medium leading-snug">{block.body || parsed.stem}</div>

            {block.pairs.length > 0 && (
              <ul className="w-full max-w-md space-y-1 rounded-md border bg-muted/40 p-3 font-mono text-sm">
                {block.pairs.map((line, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 border-b border-dashed border-border/60 pb-1 last:border-0 last:pb-0">
                    <span>{line.split("/")[0]?.trim()}</span>
                    <span>{line.split("/").slice(1).join("/").trim()}</span>
                  </li>
                ))}
              </ul>
            )}

            {block.series.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-3 font-mono text-base">
                {block.series.map((item, i) => (
                  <span
                    key={i}
                    className="min-w-[3rem] rounded-sm border border-border/60 bg-background px-3 py-1.5 text-center"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}

            {block.quote.length > 0 && (
              <ul className="w-full space-y-1 rounded-md border-l-4 border-primary/50 bg-muted/40 p-3 text-sm italic">
                {block.quote.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}


            {img && renderImage?.(img, active.question_number)}

            {parsed.options.length > 0 ? (
              <div className="space-y-3">
                <ol className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm">
                  {parsed.options.map((opt) => (
                    <li key={opt.key} className="flex gap-2">
                      <span className="font-semibold text-primary">{opt.key}.</span>
                      <span className="min-w-0 break-words">{opt.label}</span>
                    </li>
                  ))}
                </ol>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Pilih jawaban Anda</div>
                  <div className="flex flex-wrap gap-2">
                    {parsed.options.map((opt) => {
                      const picked = activeAnswer === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => onChange(active.id, picked ? "" : opt.key)}
                          aria-pressed={picked}
                          aria-label={`Pilih jawaban ${opt.key}`}
                          className={`flex h-11 w-11 items-center justify-center rounded-md border text-base font-bold transition ${
                            picked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input bg-background hover:bg-accent"
                          }`}
                        >
                          {opt.key}
                        </button>
                      );
                    })}
                  </div>
                </div>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
