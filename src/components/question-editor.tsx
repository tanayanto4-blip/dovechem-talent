import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { upsertTestQuestion, deleteTestQuestion, updateTestMeta } from "@/lib/admin.functions";
import { useIsAdmin } from "@/components/publish-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Plus, Trash2, X, Settings2 } from "lucide-react";

const KEYS = [["admin-tests"], ["admin-test"], ["mbti-questions"], ["candidate-tests"], ["admin-stats"]];

function useInvalidate() {
  const qc = useQueryClient();
  return () => KEYS.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
}

export type EditableQuestion = {
  id?: string;
  question_number?: number;
  question_text?: string | null;
  dimension?: string | null;
  correct_answer?: string | null;
  options?: unknown;
};

type OptRow = { key: string; label: string; dimension: string };

function toRows(options: unknown): OptRow[] | null {
  if (!Array.isArray(options)) return null;
  const rows = options
    .filter((o) => o && typeof o === "object")
    .map((o: any) => ({
      key: String(o.key ?? ""),
      label: String(o.label ?? ""),
      dimension: o.dimension ? String(o.dimension) : "",
    }));
  return rows.length > 0 ? rows : null;
}

/** Dialog edit/tambah soal untuk semua jenis test di Bank Soal (khusus Super Admin). */
export function QuestionEditorDialog({
  testId,
  question,
  nextNumber,
  label,
}: {
  testId: string;
  question?: EditableQuestion;
  nextNumber?: number;
  label?: string;
}) {
  const isAdmin = useIsAdmin();
  const invalidate = useInvalidate();
  const save = useServerFn(upsertTestQuestion);
  const [open, setOpen] = useState(false);

  const initialRows = useMemo(() => toRows(question?.options), [question?.options]);
  const isJsonOptions =
    question?.options != null && !Array.isArray(question.options) && typeof question.options === "object";

  const [number, setNumber] = useState<string>("");
  const [text, setText] = useState("");
  const [dimension, setDimension] = useState("");
  const [correct, setCorrect] = useState("");
  const [rows, setRows] = useState<OptRow[]>([]);
  const [useOptions, setUseOptions] = useState(false);
  const [json, setJson] = useState("");
  const [useJson, setUseJson] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNumber(String(question?.question_number ?? nextNumber ?? 1));
    setText(question?.question_text ?? "");
    setDimension(question?.dimension ?? "");
    setCorrect(question?.correct_answer ?? "");
    setRows(initialRows ?? []);
    setUseOptions(!!initialRows);
    setUseJson(!!isJsonOptions);
    setJson(isJsonOptions ? JSON.stringify(question?.options, null, 2) : "");
  }, [open, question, nextNumber, initialRows, isJsonOptions]);

  const mutation = useMutation({
    mutationFn: async () => {
      let options: unknown = null;
      if (useJson) {
        const raw = json.trim();
        options = raw ? JSON.parse(raw) : null;
      } else if (useOptions) {
        const cleaned = rows
          .map((r) => ({ key: r.key.trim(), label: r.label.trim(), dimension: r.dimension.trim() }))
          .filter((r) => r.key && r.label)
          .map((r) => (r.dimension ? r : { key: r.key, label: r.label }));
        if (cleaned.length < 2) throw new Error("Isi minimal 2 pilihan jawaban.");
        options = cleaned;
      }
      return save({
        data: {
          question_id: question?.id,
          test_id: testId,
          question_number: Number(number) || 1,
          question_text: text.trim(),
          dimension: dimension.trim() || null,
          correct_answer: correct.trim() || null,
          options,
        },
      });
    },
    onSuccess: () => {
      toast.success(question?.id ? "Soal diperbarui." : "Soal ditambahkan.");
      invalidate();
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal menyimpan soal."),
  });

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={question?.id ? "outline" : "default"} size="sm">
          {question?.id ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {label ?? (question?.id ? "Edit" : "Tambah Soal")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question?.id ? "Edit Soal" : "Tambah Soal Baru"}</DialogTitle>
          <DialogDescription>
            Ubah nomor, teks soal, pilihan jawaban, kunci, dan dimensi. Perubahan langsung berlaku untuk kandidat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <div className="space-y-1">
              <Label htmlFor="q-number">Nomor</Label>
              <Input id="q-number" type="number" min={1} value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="q-dim">Dimensi (opsional)</Label>
              <Input
                id="q-dim"
                value={dimension}
                onChange={(e) => setDimension(e.target.value)}
                placeholder="mis. E/I, D, Verbal"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="q-text">Teks soal</Label>
            <Textarea id="q-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          </div>

          {!useJson && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Pilihan jawaban</div>
                <div className="flex gap-2">
                  {useOptions ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setRows((r) => [...r, { key: String(r.length + 1), label: "", dimension: "" }])}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Pilihan
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setUseOptions(false)}>
                        Jadikan isian bebas
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setUseOptions(true);
                        setRows([
                          { key: "1", label: "", dimension: "" },
                          { key: "2", label: "", dimension: "" },
                        ]);
                      }}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Tambah pilihan
                    </Button>
                  )}
                </div>
              </div>

              {useOptions ? (
                <div className="space-y-2">
                  {rows.map((r, i) => (
                    <div key={i} className="grid grid-cols-[64px_1fr_92px_36px] items-center gap-2">
                      <Input
                        value={r.key}
                        aria-label={`Kunci pilihan ${i + 1}`}
                        onChange={(e) =>
                          setRows((prev) => prev.map((x, j) => (i === j ? { ...x, key: e.target.value } : x)))
                        }
                      />
                      <Input
                        value={r.label}
                        aria-label={`Teks pilihan ${i + 1}`}
                        placeholder="Teks pilihan"
                        onChange={(e) =>
                          setRows((prev) => prev.map((x, j) => (i === j ? { ...x, label: e.target.value } : x)))
                        }
                      />
                      <Input
                        value={r.dimension}
                        aria-label={`Dimensi pilihan ${i + 1}`}
                        placeholder="Dim"
                        onChange={(e) =>
                          setRows((prev) => prev.map((x, j) => (i === j ? { ...x, dimension: e.target.value } : x)))
                        }
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Hapus pilihan ${i + 1}`}
                        onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Soal ini berupa isian bebas — kandidat mengetik jawabannya sendiri.
                </p>
              )}
            </div>
          )}

          {useJson && (
            <div className="space-y-1">
              <Label htmlFor="q-json">Data soal (JSON lanjutan)</Label>
              <Textarea id="q-json" rows={8} className="font-mono text-xs" value={json} onChange={(e) => setJson(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Format khusus (mis. deret angka Pauli). Ubah dengan hati-hati agar tetap valid.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="q-key">Kunci jawaban (opsional)</Label>
              <Input id="q-key" value={correct} onChange={(e) => setCorrect(e.target.value)} className="w-48" />
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setUseJson((v) => !v)}>
              <Settings2 className="mr-1 h-3.5 w-3.5" /> {useJson ? "Mode pilihan biasa" : "Mode JSON lanjutan"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !text.trim()}>
            {mutation.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Tombol hapus satu soal (Super Admin). */
export function QuestionDeleteButton({ id, number }: { id: string; number?: number }) {
  const isAdmin = useIsAdmin();
  const invalidate = useInvalidate();
  const del = useServerFn(deleteTestQuestion);
  const mutation = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Soal dihapus.");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal menghapus soal."),
  });
  if (!isAdmin) return null;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label={`Hapus soal ${number ?? ""}`}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus soal {number ? `nomor ${number}` : ""}?</AlertDialogTitle>
          <AlertDialogDescription>
            Soal dan jawaban kandidat untuk soal ini akan dihapus permanen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Edit nama & deskripsi test. */
export function TestMetaEditor({
  testId,
  name,
  description,
}: {
  testId: string;
  name: string;
  description?: string | null;
}) {
  const isAdmin = useIsAdmin();
  const invalidate = useInvalidate();
  const save = useServerFn(updateTestMeta);
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(name);
  const [d, setD] = useState(description ?? "");

  useEffect(() => {
    if (open) {
      setN(name);
      setD(description ?? "");
    }
  }, [open, name, description]);

  const mutation = useMutation({
    mutationFn: () => save({ data: { id: testId, name: n.trim(), description: d.trim() || null } }),
    onSuccess: () => {
      toast.success("Informasi test diperbarui.");
      invalidate();
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal menyimpan."),
  });

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="mr-2 h-4 w-4" /> Edit Info Test
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Informasi Test</DialogTitle>
          <DialogDescription>Ubah nama dan deskripsi test yang tampil untuk kandidat.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="t-name">Nama test</Label>
            <Input id="t-name" value={n} onChange={(e) => setN(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="t-desc">Deskripsi</Label>
            <Textarea id="t-desc" rows={4} value={d} onChange={(e) => setD(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !n.trim()}>
            {mutation.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
