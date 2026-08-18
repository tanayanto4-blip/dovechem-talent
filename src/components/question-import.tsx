import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { importTestQuestions } from "@/lib/admin.functions";
import { useIsStaff } from "@/components/publish-toggle";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileDown, ClipboardPaste } from "lucide-react";

const KEYS = [
  ["admin-tests"],
  ["admin-test"],
  ["candidate-tests"],
  ["test-intro"],
  ["start-test"],
  ["admin-stats"],
];

const TEMPLATE =
  "nomor;soal;pilihan;kunci;dimensi\n" +
  "1;Berapa hasil 2 + 3?;A. 4 | B. 5 | C. 6;B;Numerik\n" +
  "2;Tuliskan sinonim kata besar;;;Verbal\n";

type ParsedRow = {
  question_number: number;
  question_text: string;
  options: { key: string; label: string; dimension?: string }[] | null;
  correct_answer: string | null;
  dimension: string | null;
};

function splitLine(line: string): string[] {
  const delim = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (ch === delim && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** "A. Teks | B. Teks" atau "Teks // Teks" → daftar pilihan bernomor. */
function parseOptions(raw: string): ParsedRow["options"] {
  const text = raw.trim();
  if (!text) return null;
  const parts = text
    .split(/\s*(?:\||\/\/|;;)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  return parts.map((p, i) => {
    const m = p.match(/^([A-Za-z0-9]{1,3})[.)]\s*(.+)$/);
    return m ? { key: m[1]!.toUpperCase(), label: m[2]!.trim() } : { key: String(i + 1), label: p };
  });
}

export function parseQuestionsText(text: string): { rows: ParsedRow[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { rows: [], errors: ["File/teks kosong."] };

  const first = splitLine(lines[0]!).join(" ").toLowerCase();
  const body = /nomor|soal|question/.test(first) && !/^\d/.test(lines[0]!) ? lines.slice(1) : lines;

  const rows: ParsedRow[] = [];
  body.forEach((line, idx) => {
    const c = splitLine(line);
    const num = Number(c[0]);
    const question = (c[1] ?? "").trim();
    if (!Number.isInteger(num) || num < 1) {
      errors.push(`Baris ${idx + 1}: nomor soal tidak valid ("${c[0] ?? ""}").`);
      return;
    }
    if (!question) {
      errors.push(`Baris ${idx + 1}: teks soal kosong.`);
      return;
    }
    rows.push({
      question_number: num,
      question_text: question,
      options: parseOptions(c[2] ?? ""),
      correct_answer: (c[3] ?? "").trim() || null,
      dimension: (c[4] ?? "").trim() || null,
    });
  });
  return { rows, errors };
}

/** Impor soal sendiri (CSV/TSV atau tempel dari Excel) — Super Admin & HR. */
export function QuestionImportDialog({ testId }: { testId: string }) {
  const isStaff = useIsStaff();
  const qc = useQueryClient();
  const importFn = useServerFn(importTestQuestions);
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [mode, setMode] = useState<"append" | "replace">("append");

  const parsed = parseQuestionsText(raw);

  const mutation = useMutation({
    mutationFn: () => importFn({ data: { test_id: testId, mode, rows: parsed.rows } }),
    onSuccess: async (r) => {
      toast.success(`Impor selesai — ${r.created} soal baru, ${r.updated} diperbarui.`);
      await Promise.all(
        KEYS.map((queryKey) => qc.invalidateQueries({ queryKey, refetchType: "all" })),
      );
      setOpen(false);
      setRaw("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal mengimpor soal."),
  });

  if (!isStaff) return null;

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-bank-soal.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="mr-2 h-4 w-4" /> Impor Soal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Impor Soal Sendiri</DialogTitle>
          <DialogDescription>
            Unggah file CSV/TSV atau tempel langsung dari Excel. Format kolom:{" "}
            <b>nomor; soal; pilihan; kunci; dimensi</b>. Pilihan dipisah tanda <b>|</b> (contoh:{" "}
            <code>A. Empat | B. Lima</code>). Kosongkan kolom pilihan untuk soal isian bebas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/plain"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setRaw(await f.text());
                e.target.value = "";
              }}
            />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Pilih file CSV/TSV
            </Button>
            <Button size="sm" variant="ghost" onClick={downloadTemplate}>
              <FileDown className="mr-2 h-4 w-4" /> Unduh template
            </Button>
          </div>

          <div className="space-y-1">
            <Label htmlFor="import-raw" className="flex items-center gap-2">
              <ClipboardPaste className="h-4 w-4" /> Isi / tempel data soal
            </Label>
            <Textarea
              id="import-raw"
              rows={10}
              className="font-mono text-xs"
              placeholder={TEMPLATE}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <Label>Cara impor</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as "append" | "replace")}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="append">Tambah / perbarui nomor yang sama</SelectItem>
                  <SelectItem value="replace">Ganti seluruh soal test ini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge variant={parsed.rows.length ? "secondary" : "outline"}>
              {parsed.rows.length} soal terbaca
            </Badge>
            {!!parsed.errors.length && (
              <Badge variant="destructive">{parsed.errors.length} baris bermasalah</Badge>
            )}
          </div>

          {!!parsed.errors.length && (
            <ul className="max-h-28 overflow-auto rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
              {parsed.errors.slice(0, 10).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}

          {!!parsed.rows.length && (
            <div className="max-h-48 overflow-auto rounded-md border">
              {parsed.rows.slice(0, 20).map((r) => (
                <div key={r.question_number} className="border-b p-2 text-xs last:border-b-0">
                  <b>#{r.question_number}</b> {r.question_text}
                  {r.options && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {r.options.length} pilihan{r.correct_answer ? ` · kunci ${r.correct_answer}` : ""}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {mode === "replace" && (
            <p className="text-xs text-destructive">
              Mode ganti akan menghapus semua soal lama test ini beserta jawaban kandidat yang
              terkait.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !parsed.rows.length}
          >
            {mutation.isPending ? "Mengimpor..." : `Impor ${parsed.rows.length} soal`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
