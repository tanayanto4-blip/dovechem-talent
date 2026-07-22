import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  listTests,
  getTestWithQuestions,
  setTestActive,
  upsertMbtiQuestion,
  deleteMbtiQuestion,
  setMbtiQuestionsActive,
  reorderMbtiQuestions,
} from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2, Search, Upload, Download, Eye, CheckCircle2, EyeOff, ArrowUp, ArrowDown, ListOrdered } from "lucide-react";

export const Route = createFileRoute("/admin/mbti")({
  head: () => ({ meta: [
    { title: "Bank Soal MBTI — Admin" },
    { name: "description", content: "Kelola 60 item soal MBTI: pasangan A/B, dimensi, dan status publish." },
  ]}),
  component: MbtiAdmin,
});

type Dim = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";
const DIM_LIST: Dim[] = ["E", "I", "S", "N", "T", "F", "J", "P"];

type OptRow = { key: "A" | "B"; label: string; dimension: Dim };
type QRow = { id: string; question_number: number; question_text: string; options: OptRow[]; dimension: string | null; active?: boolean };
type Draft = { question_id: string | null; question_number: number; question_text: string; a_label: string; a_dim: Dim; b_label: string; b_dim: Dim };

function emptyDraft(nextNumber: number): Draft {
  return { question_id: null, question_number: nextNumber, question_text: "Pilih pernyataan yang paling menggambarkan diri Anda.", a_label: "", a_dim: "E", b_label: "", b_dim: "I" };
}

function MbtiAdmin() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTests);
  const detailFn = useServerFn(getTestWithQuestions);
  const toggleFn = useServerFn(setTestActive);
  const upsertFn = useServerFn(upsertMbtiQuestion);
  const deleteFn = useServerFn(deleteMbtiQuestion);

  const { data: testsData, isLoading: loadingTests } = useQuery({ queryKey: ["admin-tests"], queryFn: () => listFn({ data: {} as never }) });
  const mbtiTests = useMemo(() => ((testsData?.tests ?? []) as any[]).filter((t) => t.test_type === "mbti"), [testsData]);
  const [testId, setTestId] = useState<string | null>(null);
  const activeTestId = testId ?? mbtiTests[0]?.id ?? null;
  const activeTest = mbtiTests.find((t) => t.id === activeTestId);

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["admin-mbti", activeTestId],
    queryFn: () => detailFn({ data: { id: activeTestId! } }),
    enabled: !!activeTestId,
  });

  const questions: QRow[] = useMemo(() => (detail?.questions ?? []) as any[], [detail]);
  const [search, setSearch] = useState("");
  const [dimFilter, setDimFilter] = useState<string>("all");
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (dimFilter !== "all" && q.dimension !== dimFilter) return false;
      if (!s) return true;
      const hay = `${q.question_number} ${q.question_text} ${(q.options ?? []).map((o) => o.label).join(" ")}`.toLowerCase();
      return hay.includes(s);
    });
  }, [questions, search, dimFilter]);

  const dimOptions = useMemo(() => Array.from(new Set(questions.map((q) => q.dimension).filter(Boolean))) as string[], [questions]);
  const nextNumber = useMemo(() => (questions.length ? Math.max(...questions.map((q) => q.question_number)) + 1 : 1), [questions]);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<QRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importRunning, setImportRunning] = useState(false);
  const [importLog, setImportLog] = useState<{ ok: number; fail: number; errors: string[] } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState<null | "on" | "off">(null);
  const bulkFn = useServerFn(setMbtiQuestionsActive);

  const filteredIds = useMemo(() => filtered.map((q) => q.id), [filtered]);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const someSelected = !allSelected && filteredIds.some((id) => selected.has(id));
  function toggleOne(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }
  function toggleAllFiltered(on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      filteredIds.forEach((id) => { if (on) next.add(id); else next.delete(id); });
      return next;
    });
  }
  async function handleBulk(active: boolean) {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkRunning(active ? "on" : "off");
    try {
      const res: any = await bulkFn({ data: { ids, active } });
      const skipped = res?.skipped ?? 0;
      toast.success(`${active ? "Dipublish" : "Di-unpublish"} ${res?.updated ?? ids.length} soal${skipped ? ` (${skipped} dilewati)` : ""}.`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-mbti", activeTestId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal memperbarui status publish.");
    } finally {
      setBulkRunning(null);
    }
  }

  const reorderFn = useServerFn(reorderMbtiQuestions);
  const [reordering, setReordering] = useState(false);
  const sortedAll = useMemo(
    () => [...questions].sort((a, b) => a.question_number - b.question_number),
    [questions],
  );
  async function applyOrder(orderedIds: string[]) {
    if (!activeTestId) return;
    setReordering(true);
    try {
      await reorderFn({ data: { test_id: activeTestId, ordered_ids: orderedIds } });
      qc.invalidateQueries({ queryKey: ["admin-mbti", activeTestId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal mengubah urutan soal.");
    } finally {
      setReordering(false);
    }
  }
  async function moveQuestion(id: string, dir: -1 | 1) {
    const ids = sortedAll.map((q) => q.id);
    const idx = ids.indexOf(id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= ids.length) return;
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    await applyOrder(ids);
  }
  async function moveToPosition(id: string, pos: number) {
    const ids = sortedAll.map((q) => q.id);
    const idx = ids.indexOf(id);
    if (idx < 0) return;
    const clamped = Math.max(1, Math.min(ids.length, Math.floor(pos)));
    if (clamped - 1 === idx) return;
    ids.splice(idx, 1);
    ids.splice(clamped - 1, 0, id);
    await applyOrder(ids);
  }
  async function normalizeNumbers() {
    if (!sortedAll.length) return;
    await applyOrder(sortedAll.map((q) => q.id));
    toast.success("Nomor soal dirapikan menjadi 1..N.");
  }

  function openCreate() { setDraft(emptyDraft(nextNumber)); }
  function openEdit(q: QRow) {
    const a = q.options?.find((o) => o.key === "A");
    const b = q.options?.find((o) => o.key === "B");
    setDraft({
      question_id: q.id,
      question_number: q.question_number,
      question_text: q.question_text,
      a_label: a?.label ?? "",
      a_dim: (a?.dimension as Dim) ?? "E",
      b_label: b?.label ?? "",
      b_dim: (b?.dimension as Dim) ?? "I",
    });
  }

  async function handleTogglePublish(next: boolean) {
    if (!activeTestId) return;
    try {
      await toggleFn({ data: { id: activeTestId, active: next } });
      toast.success(next ? "Test dipublikasikan" : "Test disembunyikan");
      qc.invalidateQueries({ queryKey: ["admin-tests"] });
    } catch (e: any) { toast.error(e?.message ?? "Gagal mengubah status"); }
  }

  async function handleSave() {
    if (!draft || !activeTestId) return;
    if (draft.a_dim === draft.b_dim) { toast.error("Dimensi A dan B harus berbeda"); return; }
    if (!draft.a_label.trim() || !draft.b_label.trim()) { toast.error("Isi kedua pernyataan A dan B"); return; }
    setSaving(true);
    try {
      await upsertFn({ data: {
        test_id: activeTestId,
        question_id: draft.question_id ?? undefined,
        question_number: draft.question_number,
        question_text: draft.question_text.trim(),
        options: [
          { key: "A", label: draft.a_label.trim(), dimension: draft.a_dim },
          { key: "B", label: draft.b_label.trim(), dimension: draft.b_dim },
        ],
      }});
      toast.success(draft.question_id ? "Soal diperbarui" : "Soal ditambahkan");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-mbti", activeTestId] });
    } catch (e: any) { toast.error(e?.message ?? "Gagal menyimpan"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await deleteFn({ data: { id: confirmDelete.id } });
      toast.success("Soal dihapus");
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ["admin-mbti", activeTestId] });
    } catch (e: any) { toast.error(e?.message ?? "Gagal menghapus"); }
    finally { setDeletingId(null); }
  }

  async function handleImport() {
    if (!activeTestId) return;
    const rows = parseCsv(importText);
    if (!rows.length) { toast.error("CSV kosong atau format tidak dikenali"); return; }
    setImportRunning(true);
    setImportLog(null);
    const usedNums = new Set(questions.map((q) => q.question_number));
    let auto = nextNumber;
    let ok = 0, fail = 0;
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        let num = Number(r.number);
        if (!Number.isFinite(num) || num < 1) { while (usedNums.has(auto)) auto++; num = auto; }
        usedNums.add(num); if (num >= auto) auto = num + 1;
        const aDim = r.a_dim?.toUpperCase() as Dim;
        const bDim = r.b_dim?.toUpperCase() as Dim;
        if (!DIM_LIST.includes(aDim) || !DIM_LIST.includes(bDim)) throw new Error(`Dimensi tidak valid (${r.a_dim}/${r.b_dim})`);
        if (aDim === bDim) throw new Error("Dimensi A dan B harus berbeda");
        if (!r.a_label?.trim() || !r.b_label?.trim()) throw new Error("Pernyataan A/B kosong");
        await upsertFn({ data: {
          test_id: activeTestId,
          question_number: num,
          question_text: (r.question_text?.trim() || "Pilih pernyataan yang paling menggambarkan diri Anda."),
          options: [
            { key: "A", label: r.a_label.trim(), dimension: aDim },
            { key: "B", label: r.b_label.trim(), dimension: bDim },
          ],
        }});
        ok++;
      } catch (e: any) {
        fail++;
        errors.push(`Baris ${i + 1}: ${e?.message ?? "gagal"}`);
      }
    }
    setImportRunning(false);
    setImportLog({ ok, fail, errors });
    if (ok) toast.success(`${ok} soal diimpor`);
    if (fail) toast.error(`${fail} baris gagal`);
    qc.invalidateQueries({ queryKey: ["admin-mbti", activeTestId] });
  }

  function downloadTemplate() {
    const csv = "number,question_text,a_label,a_dim,b_label,b_dim\n" +
      "1,Pilih pernyataan yang paling menggambarkan diri Anda.,\"Saya suka bekerja dalam kelompok besar\",E,\"Saya lebih nyaman bekerja sendiri\",I\n" +
      "2,Pilih pernyataan yang paling menggambarkan diri Anda.,\"Saya fokus pada detail konkret\",S,\"Saya suka melihat pola dan kemungkinan\",N\n";
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "template-mbti.csv"; a.click();
    URL.revokeObjectURL(url);
  }


  if (loadingTests) return <div className="text-muted-foreground">Memuat...</div>;
  if (!mbtiTests.length) return <div className="rounded-md border bg-muted/40 p-6 text-sm text-muted-foreground">Belum ada test bertipe MBTI.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary">Bank Soal MBTI</h1>
          <p className="text-sm text-muted-foreground">Kelola pasangan A/B, dimensi (E/I, S/N, T/F, J/P), dan status publish.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mbtiTests.length > 1 && (
            <Select value={activeTestId ?? undefined} onValueChange={setTestId}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Pilih test" /></SelectTrigger>
              <SelectContent>{mbtiTests.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent>
            </Select>
          )}
          <Button asChild variant="outline"><Link to="/admin/mbti/preview"><Eye className="mr-2 h-4 w-4" /> Preview</Link></Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" /> Impor CSV</Button>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Tambah Soal</Button>
        </div>
      </div>

      {activeTest && (
        <Card className="shadow-card">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-semibold">{activeTest.name}</div>
                <Badge variant="outline" className="uppercase">{activeTest.test_type}</Badge>
                <Badge variant="secondary">{questions.length} soal</Badge>
                <Badge className={activeTest.active ? "bg-success" : ""} variant={activeTest.active ? "default" : "secondary"}>
                  {activeTest.active ? "Published" : "Draft"}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{activeTest.description}</div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Publish</Label>
              <Switch checked={!!activeTest.active} onCheckedChange={handleTogglePublish} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nomor / pernyataan..." className="pl-8" />
            </div>
            <Select value={dimFilter} onValueChange={setDimFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter dimensi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua dimensi</SelectItem>
                {dimOptions.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">{filtered.length} / {questions.length}</div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={(v) => toggleAllFiltered(v === true)}
              aria-label="Pilih semua"
            />
            <span className="text-xs text-muted-foreground">
              {selected.size > 0 ? `${selected.size} soal terpilih` : "Pilih beberapa soal untuk publikasi massal"}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" disabled={selected.size === 0 || !!bulkRunning} onClick={() => handleBulk(true)}>
                {bulkRunning === "on" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                Publish terpilih
              </Button>
              <Button size="sm" variant="outline" disabled={selected.size === 0 || !!bulkRunning} onClick={() => handleBulk(false)}>
                {bulkRunning === "off" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <EyeOff className="mr-1 h-3.5 w-3.5" />}
                Unpublish terpilih
              </Button>
              {selected.size > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={!!bulkRunning}>Bersihkan</Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingDetail ? (
            <div className="p-6 text-sm text-muted-foreground">Memuat soal...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Tidak ada soal yang cocok.</div>
          ) : (
            <div className="divide-y">
              {filtered.map((q) => {
                const a = q.options?.find((o) => o.key === "A");
                const b = q.options?.find((o) => o.key === "B");
                const isActive = q.active !== false;
                const isChecked = selected.has(q.id);
                return (
                  <div key={q.id} className={`grid gap-3 p-4 md:grid-cols-[32px_56px_1fr_170px_120px] ${isChecked ? "bg-primary/5" : ""}`}>
                    <div className="flex items-start pt-1">
                      <Checkbox checked={isChecked} onCheckedChange={(v) => toggleOne(q.id, v === true)} aria-label={`Pilih soal ${q.question_number}`} />
                    </div>
                    <div className="text-sm font-mono font-semibold text-muted-foreground">#{q.question_number}</div>
                    <div className="min-w-0 space-y-2">
                      <div className="text-xs text-muted-foreground">{q.question_text}</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded border p-2 text-sm">
                          <div className="flex items-center gap-2"><Badge variant="outline">A · {a?.dimension ?? "?"}</Badge></div>
                          <div className="mt-1">{a?.label ?? <span className="italic text-muted-foreground">(kosong)</span>}</div>
                        </div>
                        <div className="rounded border p-2 text-sm">
                          <div className="flex items-center gap-2"><Badge variant="outline">B · {b?.dimension ?? "?"}</Badge></div>
                          <div className="mt-1">{b?.label ?? <span className="italic text-muted-foreground">(kosong)</span>}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{q.dimension ?? "-"}</Badge>
                      <Badge className={isActive ? "bg-success" : ""} variant={isActive ? "default" : "secondary"}>
                        {isActive ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(q)}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(q)} disabled={deletingId === q.id}>
                        {deletingId === q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>


      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{draft?.question_id ? "Edit Soal MBTI" : "Tambah Soal MBTI"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                <div>
                  <Label className="text-xs">Nomor</Label>
                  <Input type="number" min={1} value={draft.question_number} onChange={(e) => setDraft({ ...draft, question_number: Number(e.target.value) || 1 })} />
                </div>
                <div>
                  <Label className="text-xs">Instruksi soal</Label>
                  <Input value={draft.question_text} onChange={(e) => setDraft({ ...draft, question_text: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between"><Label className="text-sm font-semibold">Pilihan A</Label>
                    <Select value={draft.a_dim} onValueChange={(v) => setDraft({ ...draft, a_dim: v as Dim })}>
                      <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{DIM_LIST.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Input value={draft.a_label} onChange={(e) => setDraft({ ...draft, a_label: e.target.value })} placeholder="Pernyataan A" />
                </div>
                <div className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between"><Label className="text-sm font-semibold">Pilihan B</Label>
                    <Select value={draft.b_dim} onValueChange={(v) => setDraft({ ...draft, b_dim: v as Dim })}>
                      <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{DIM_LIST.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Input value={draft.b_label} onChange={(e) => setDraft({ ...draft, b_label: e.target.value })} placeholder="Pernyataan B" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Dimensi tersimpan sebagai <b>{draft.a_dim}/{draft.b_dim}</b>. Nomor yang sudah dipakai soal lain akan ditolak.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus soal #{confirmDelete?.question_number}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tindakan ini permanen dan akan menghapus jawaban terkait dari attempt manapun.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!!deletingId}>{deletingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={(o) => { if (!importRunning) { setImportOpen(o); if (!o) { setImportText(""); setImportLog(null); } } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Impor Soal MBTI dari CSV</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <div className="font-semibold">Format kolom (baris pertama header):</div>
              <code className="mt-1 block font-mono">number, question_text, a_label, a_dim, b_label, b_dim</code>
              <ul className="mt-2 list-disc pl-4 text-muted-foreground">
                <li>Dimensi valid: E, I, S, N, T, F, J, P — pasangan A/B harus berbeda.</li>
                <li>Kosongkan <b>number</b> untuk penomoran otomatis lanjutan.</li>
                <li>Baris dengan nomor yang sudah ada akan menimpa soal tersebut.</li>
              </ul>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={downloadTemplate}><Download className="mr-1 h-3.5 w-3.5" /> Unduh template</Button>
                <Button size="sm" variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload className="mr-1 h-3.5 w-3.5" /> Pilih file .csv
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const text = await f.text(); setImportText(text); e.target.value = "";
                    }} />
                  </label>
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Isi CSV</Label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={10}
                className="mt-1 w-full rounded-md border bg-background p-2 font-mono text-xs"
                placeholder="number,question_text,a_label,a_dim,b_label,b_dim&#10;1,,Saya suka keramaian,E,Saya suka menyendiri,I"
              />
            </div>
            {importLog && (
              <div className="rounded-md border p-3 text-sm">
                <div><b className="text-success">Sukses:</b> {importLog.ok} · <b className="text-destructive">Gagal:</b> {importLog.fail}</div>
                {importLog.errors.length > 0 && (
                  <ul className="mt-2 max-h-40 overflow-auto list-disc pl-5 text-xs text-destructive">
                    {importLog.errors.map((er, i) => <li key={i}>{er}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importRunning}>Tutup</Button>
            <Button onClick={handleImport} disabled={importRunning || !importText.trim()}>
              {importRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Impor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function parseCsv(text: string): Array<{ number?: string; question_text?: string; a_label?: string; a_dim?: string; b_label?: string; b_dim?: string }> {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { cur.push(field); field = ""; }
      else if (ch === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else field += ch;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  const cleaned = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (!cleaned.length) return [];
  const header = cleaned[0].map((h) => h.trim().toLowerCase());
  const hasHeader = header.includes("a_label") || header.includes("a_dim") || header.includes("number");
  const dataRows = hasHeader ? cleaned.slice(1) : cleaned;
  const idx = (name: string, fallback: number) => {
    if (!hasHeader) return fallback;
    const i = header.indexOf(name); return i >= 0 ? i : fallback;
  };
  const iNum = idx("number", 0);
  const iQ = idx("question_text", 1);
  const iAL = idx("a_label", 2);
  const iAD = idx("a_dim", 3);
  const iBL = idx("b_label", 4);
  const iBD = idx("b_dim", 5);
  return dataRows.map((r) => ({
    number: r[iNum]?.trim(),
    question_text: r[iQ]?.trim(),
    a_label: r[iAL]?.trim(),
    a_dim: r[iAD]?.trim(),
    b_label: r[iBL]?.trim(),
    b_dim: r[iBD]?.trim(),
  }));
}
