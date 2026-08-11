import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CANDIDATE_TYPES, candidateTypeShort, type CandidateType } from "@/lib/candidate-type";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { bulkCreateCandidateCodes, bulkSetCodesActive, bulkSetCodesExpiry, createCandidateCode, deleteAllCodes, deleteCode, listCandidateCodes, setCodeExpiry, toggleCode } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Copy, Trash2, Layers, Power, PowerOff, Zap, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/admin/codes")({ head: () => ({ meta: [
    { title: "Kode Akses Kandidat — Admin Dover Chemical" },
    { name: "description", content: "Buat, aktifkan, dan atur masa berlaku kode akses login kandidat psikotest PT Dover Chemical." },
    { property: "og:title", content: "Kode Akses Kandidat — Admin Dover Chemical" },
    { property: "og:description", content: "Buat, aktifkan, dan atur masa berlaku kode akses login kandidat psikotest PT Dover Chemical." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: CodesPage });

function CodesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listCandidateCodes);
  const create = useServerFn(createCandidateCode);
  const bulkCreate = useServerFn(bulkCreateCandidateCodes);
  const bulkActive = useServerFn(bulkSetCodesActive);
  const bulkExpiry = useServerFn(bulkSetCodesExpiry);
  const setExpiry = useServerFn(setCodeExpiry);
  const toggle = useServerFn(toggleCode);
  const del = useServerFn(deleteCode);
  const purgeAll = useServerFn(deleteAllCodes);
  const { data } = useQuery({ queryKey: ["codes"], queryFn: () => list({ data: { limit: 1000 } }) });
  const [open, setOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"single" | "bulk">("single");

  const [autoOpen, setAutoOpen] = useState(false);
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [expiryValue, setExpiryValue] = useState("");
  const [editExpiry, setEditExpiry] = useState<{ id: string; value: string } | null>(null);
  const [form, setForm] = useState({ candidate_name: "", candidate_email: "", position_applied: "", code: "", expires_at: "", candidate_type: "karyawan" as CandidateType });
  const [bulkForm, setBulkForm] = useState({ count: 300, prefix: "DOV", name_prefix: "Kandidat", position_applied: "", start_number: 1, expires_at: "", candidate_type: "karyawan" as CandidateType });
  const [autoForm, setAutoForm] = useState({ count: 300, expires_at: "", candidate_type: "karyawan" as CandidateType });
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeText, setPurgeText] = useState("");
  const [purging, setPurging] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Urutan stabil: kode yang dibuat massal punya created_at identik,
  // tanpa tiebreaker urutannya bisa berubah tiap refetch (terlihat seperti "salah nomor").
  const codes: any[] = [...(data?.codes ?? [])].sort((a: any, b: any) =>
    String(a.code).localeCompare(String(b.code), "en", { numeric: true }) || String(a.id).localeCompare(String(b.id)),
  );

  async function onToggle(id: string, active: boolean) {
    setTogglingId(id);
    try {
      await toggle({ data: { id, active } });
      await qc.invalidateQueries({ queryKey: ["codes"] });
      toast.success(active ? "Kode diaktifkan" : "Kode dinonaktifkan");
    } catch {
      toast.error("Gagal mengubah status kode");
    } finally {
      setTogglingId(null);
    }
  }

  async function onDelete(id: string, code: string) {
    if (!confirm(`Hapus kode ${code}? Data kandidat, dokumen, dan hasil tes tetap tersimpan.`)) return;
    await del({ data: { id } });
    qc.invalidateQueries({ queryKey: ["codes"] });
    toast.success("Kode dihapus");
  }

  function toIso(local: string): string | null {
    if (!local) return null;
    const d = new Date(local);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  async function onAuto(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(autoForm.count) || 0;
    if (n <= 0) { toast.error("Jumlah harus lebih dari 0"); return; }
    setAutoSaving(true);
    try {
      const res = await bulkCreate({ data: {
        count: n, prefix: "DOV", name_prefix: "Kandidat",
        position_applied: null, start_number: 1,
        expires_at: toIso(autoForm.expires_at),
        candidate_type: autoForm.candidate_type,
      }});
      toast.success(`${res.created} kode otomatis dibuat & aktif — siap login`);
      qc.invalidateQueries({ queryKey: ["codes"] });
      setAutoOpen(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setAutoSaving(false); }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { expires_at, ...rest } = form;
      const res = await create({ data: { ...rest, expires_at: toIso(expires_at) } });
      toast.success(`Kode dibuat: ${res.code.code}`);
      qc.invalidateQueries({ queryKey: ["codes"] });
      setOpen(false);
      setForm({ candidate_name: "", candidate_email: "", position_applied: "", code: "", expires_at: "", candidate_type: form.candidate_type });
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function onBulk(e: React.FormEvent) {
    e.preventDefault();
    setBulkSaving(true);
    try {
      const res = await bulkCreate({ data: {
        count: Number(bulkForm.count) || 0,
        prefix: bulkForm.prefix || null,
        name_prefix: bulkForm.name_prefix || null,
        position_applied: bulkForm.position_applied || null,
        start_number: Number(bulkForm.start_number) || 1,
        expires_at: toIso(bulkForm.expires_at),
        candidate_type: bulkForm.candidate_type,
      }});
      toast.success(`${res.created} kode dibuat & aktif`);
      qc.invalidateQueries({ queryKey: ["codes"] });
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setBulkSaving(false); }
  }

  async function submitBulkExpiry(e: React.FormEvent) {
    e.preventDefault();
    const iso = expiryValue ? toIso(expiryValue) : null;
    if (expiryValue && !iso) { toast.error("Format tanggal tidak valid"); return; }
    try {
      const res = await bulkExpiry({ data: { expires_at: iso } });
      toast.success(`${res.updated} kode diperbarui`);
      qc.invalidateQueries({ queryKey: ["codes"] });
      setExpiryOpen(false);
    } catch (e: any) { toast.error(e.message); }
  }

  function onEditExpiry(id: string, current: string | null) {
    const cur = current ? new Date(new Date(current).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
    setEditExpiry({ id, value: cur });
  }

  async function submitEditExpiry(e: React.FormEvent) {
    e.preventDefault();
    if (!editExpiry) return;
    const iso = editExpiry.value ? toIso(editExpiry.value) : null;
    if (editExpiry.value && !iso) { toast.error("Format tanggal tidak valid"); return; }
    try {
      await setExpiry({ data: { id: editExpiry.id, expires_at: iso } });
      qc.invalidateQueries({ queryKey: ["codes"] });
      toast.success("Masa berlaku diperbarui");
      setEditExpiry(null);
    } catch (e: any) { toast.error(e.message); }
  }

  async function onBulkActive(active: boolean) {
    if (!confirm(`${active ? "Aktifkan" : "Nonaktifkan"} SEMUA kode kandidat?`)) return;
    try {
      const res = await bulkActive({ data: { active } });
      toast.success(`${res.updated} kode diperbarui`);
      qc.invalidateQueries({ queryKey: ["codes"] });
    } catch (e: any) { toast.error(e.message); }
  }

  async function onDeleteAll(e: React.FormEvent) {
    e.preventDefault();
    if (purgeText.trim().toUpperCase() !== "HAPUS SEMUA") { toast.error('Ketik persis: HAPUS SEMUA'); return; }
    setPurging(true);
    try {
      const res = await purgeAll({ data: { confirm: "HAPUS SEMUA" as const } });
      toast.success(`${res.deleted} kode dihapus — dokumen & hasil tes tetap tersimpan`);
      qc.invalidateQueries();
      setPurgeOpen(false);
      setPurgeText("");
    } catch (e: any) { toast.error(e.message); }
    finally { setPurging(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Kode Kandidat</h1>
          <p className="text-muted-foreground">Buat kode akses untuk kandidat login ke portal test.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAutoOpen(true)} disabled={autoSaving} className="bg-gradient-to-r from-primary to-primary-glow">
            <Zap className="mr-2 h-4 w-4" /> {autoSaving ? "Membuat..." : "Otomatis Buat Kode"}
          </Button>
          <Button variant="outline" onClick={() => onBulkActive(true)}><Power className="mr-2 h-4 w-4" /> Aktifkan Semua</Button>
          <Button variant="outline" onClick={() => onBulkActive(false)}><PowerOff className="mr-2 h-4 w-4" /> Nonaktifkan Semua</Button>
          <Button variant="outline" onClick={() => { setExpiryValue(""); setExpiryOpen(true); }}><CalendarClock className="mr-2 h-4 w-4" /> Set Masa Berlaku Semua</Button>
          <Dialog open={purgeOpen} onOpenChange={(v) => { setPurgeOpen(v); if (!v) setPurgeText(""); }}>
            <DialogTrigger asChild>
              <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Hapus Semua Kode</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Hapus Semua Kode Kandidat</DialogTitle></DialogHeader>
              <form onSubmit={onDeleteAll} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Seluruh kode akses ({codes.length} kode) akan dihapus dan kandidat tidak bisa login lagi.
                  <b className="text-foreground"> Data kandidat, berkas di Bank Dokumen, dan Bank Data Hasil tetap tersimpan</b> (kode lama disimpan sebagai arsip pada data kandidat).
                </p>
                <div className="space-y-2">
                  <Label>Ketik <b>HAPUS SEMUA</b> untuk konfirmasi</Label>
                  <Input value={purgeText} onChange={(e) => setPurgeText(e.target.value)} placeholder="HAPUS SEMUA" />
                </div>
                <DialogFooter>
                  <Button type="submit" variant="destructive" disabled={purging}>{purging ? "Menghapus..." : "Hapus Semua Kode"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Buat Kode</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Buat Kode Kandidat</DialogTitle></DialogHeader>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={createMode === "single" ? "default" : "outline"} onClick={() => setCreateMode("single")} className="flex-1"><Plus className="mr-2 h-4 w-4" /> Satuan</Button>
                <Button type="button" size="sm" variant={createMode === "bulk" ? "default" : "outline"} onClick={() => setCreateMode("bulk")} className="flex-1"><Layers className="mr-2 h-4 w-4" /> Massal</Button>
              </div>
              {createMode === "single" ? (
                <form onSubmit={onCreate} className="space-y-4">
                  <div className="space-y-2"><Label>Tipe Kandidat *</Label><TypePicker value={form.candidate_type} onChange={(v) => setForm({ ...form, candidate_type: v })} /></div>
                  <div className="space-y-2"><Label>Nama Kandidat *</Label><Input required value={form.candidate_name} onChange={(e) => setForm({ ...form, candidate_name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.candidate_email} onChange={(e) => setForm({ ...form, candidate_email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Posisi Dilamar</Label><Input value={form.position_applied} onChange={(e) => setForm({ ...form, position_applied: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Kode Custom (opsional)</Label><Input placeholder="Kosongkan untuk auto-generate" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
                  <div className="space-y-2"><Label>Masa Berlaku (opsional)</Label><Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
                  <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Membuat..." : "Buat"}</Button></DialogFooter>
                </form>
              ) : (
                <form onSubmit={onBulk} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Jumlah *</Label><Input type="number" min={1} max={1000} required value={bulkForm.count} onChange={(e) => setBulkForm({ ...bulkForm, count: Number(e.target.value) })} /></div>
                    <div className="space-y-2"><Label>Mulai Nomor</Label><Input type="number" min={1} value={bulkForm.start_number} onChange={(e) => setBulkForm({ ...bulkForm, start_number: Number(e.target.value) })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Tipe Kandidat *</Label><TypePicker value={bulkForm.candidate_type} onChange={(v) => setBulkForm({ ...bulkForm, candidate_type: v })} /></div>
                  <div className="space-y-2"><Label>Prefix Kode</Label><Input value={bulkForm.prefix} onChange={(e) => setBulkForm({ ...bulkForm, prefix: e.target.value.toUpperCase() })} placeholder="DOV" /></div>
                  <div className="space-y-2"><Label>Prefix Nama Kandidat</Label><Input value={bulkForm.name_prefix} onChange={(e) => setBulkForm({ ...bulkForm, name_prefix: e.target.value })} placeholder="Kandidat" /></div>
                  <div className="space-y-2"><Label>Posisi Dilamar</Label><Input value={bulkForm.position_applied} onChange={(e) => setBulkForm({ ...bulkForm, position_applied: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Masa Berlaku (opsional)</Label><Input type="datetime-local" value={bulkForm.expires_at} onChange={(e) => setBulkForm({ ...bulkForm, expires_at: e.target.value })} /><p className="text-[11px] text-muted-foreground">Kosongkan jika tanpa batas waktu.</p></div>
                  <p className="text-xs text-muted-foreground">Semua kode dibuat dalam status <b>aktif</b> dan langsung bisa dipakai kandidat login.</p>
                  <DialogFooter><Button type="submit" disabled={bulkSaving}>{bulkSaving ? "Membuat..." : `Buat ${bulkForm.count} Kode`}</Button></DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>

        </div>
      </div>

      <Dialog open={autoOpen} onOpenChange={setAutoOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Otomatis Buat Kode</DialogTitle></DialogHeader>
          <form onSubmit={onAuto} className="space-y-4">
            <div className="space-y-2"><Label>Jumlah Kode *</Label><Input type="number" min={1} max={1000} required value={autoForm.count} onChange={(e) => setAutoForm({ ...autoForm, count: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Tipe Kandidat *</Label><TypePicker value={autoForm.candidate_type} onChange={(v) => setAutoForm({ ...autoForm, candidate_type: v })} /></div>
            <div className="space-y-2"><Label>Masa Berlaku (opsional)</Label><Input type="datetime-local" value={autoForm.expires_at} onChange={(e) => setAutoForm({ ...autoForm, expires_at: e.target.value })} /><p className="text-[11px] text-muted-foreground">Kosongkan untuk tanpa batas waktu.</p></div>
            <p className="text-xs text-muted-foreground">Kode akan dibuat dengan prefix <b>DOV</b>, nama <b>Kandidat 001..</b>, dan langsung aktif.</p>
            <DialogFooter><Button type="submit" disabled={autoSaving}>{autoSaving ? "Membuat..." : `Buat ${autoForm.count} Kode`}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={expiryOpen} onOpenChange={setExpiryOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set Masa Berlaku Semua Kode</DialogTitle></DialogHeader>
          <form onSubmit={submitBulkExpiry} className="space-y-4">
            <div className="space-y-2"><Label>Masa Berlaku</Label><Input type="datetime-local" value={expiryValue} onChange={(e) => setExpiryValue(e.target.value)} /><p className="text-[11px] text-muted-foreground">Kosongkan untuk menghapus batas waktu semua kode.</p></div>
            <DialogFooter><Button type="submit">Simpan</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editExpiry} onOpenChange={(v) => !v && setEditExpiry(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ubah Masa Berlaku Kode</DialogTitle></DialogHeader>
          <form onSubmit={submitEditExpiry} className="space-y-4">
            <div className="space-y-2"><Label>Masa Berlaku</Label><Input type="datetime-local" value={editExpiry?.value ?? ""} onChange={(e) => setEditExpiry((s) => s ? { ...s, value: e.target.value } : s)} /><p className="text-[11px] text-muted-foreground">Kosongkan untuk menghapus batas.</p></div>
            <DialogFooter><Button type="submit">Simpan</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      <Card className="shadow-card">
        <CardHeader><CardTitle>Daftar Kode</CardTitle></CardHeader>
        <CardContent>
          {/* Mobile: kartu per kode */}
          <div className="space-y-3 md:hidden">
            {codes.map((c: any, i: number) => (
              <div key={c.id} className="rounded-lg border p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 text-xs text-muted-foreground">{i + 1}.</span>
                      <span className="truncate font-mono font-semibold">{c.code}</span>
                      <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Kode disalin"); }} className="shrink-0 text-muted-foreground hover:text-primary" aria-label="Salin kode">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="truncate text-sm font-medium">{c.candidate_name}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.candidate_email}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.position_applied ?? "-"}</div>
                    <Badge variant="outline" className="mt-1">{candidateTypeShort(c.candidate_type)}</Badge>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${c.active ? "text-success" : "text-muted-foreground"}`}>{c.active ? "Aktif" : "Off"}</span>
                      <Switch checked={c.active} disabled={togglingId === c.id} onCheckedChange={(v) => onToggle(c.id, v)} aria-label={`Aktifkan kode ${c.code}`} />
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDelete(c.id, c.code)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-2 text-xs">
                  {c.candidates?.data_completed ? <Badge className="bg-success">Data lengkap</Badge> : c.candidates ? <Badge variant="secondary">Data belum lengkap</Badge> : <Badge variant="outline">Belum login</Badge>}
                  <span className="text-muted-foreground">Digunakan: {c.used_at ? new Date(c.used_at).toLocaleDateString("id-ID") : "-"}</span>
                  <button onClick={() => onEditExpiry(c.id, c.expires_at)} className="hover:underline">
                    {c.expires_at ? (
                      <span className={new Date(c.expires_at).getTime() < Date.now() ? "text-destructive" : ""}>
                        Berlaku s/d {new Date(c.expires_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    ) : <span className="text-muted-foreground">Tanpa batas</span>}
                  </button>
                </div>
              </div>
            ))}
            {codes.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada kode. Klik "Buat Kode" untuk mulai.</p>
            )}
          </div>

          {/* Desktop: tabel */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Kandidat</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Posisi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Digunakan</TableHead>
                  <TableHead>Masa Berlaku</TableHead>
                  <TableHead className="text-center">Aktif</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((c: any, i: number) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-mono font-semibold">
                        {c.code}
                        <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Kode disalin"); }} className="text-muted-foreground hover:text-primary" aria-label="Salin kode">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate font-medium">{c.candidate_name}</div>
                      <div className="truncate text-xs text-muted-foreground">{c.candidate_email}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{candidateTypeShort(c.candidate_type)}</Badge></TableCell>
                    <TableCell>{c.position_applied ?? "-"}</TableCell>
                    <TableCell>
                      {c.candidates?.data_completed ? <Badge className="bg-success">Data lengkap</Badge> : c.candidates ? <Badge variant="secondary">Data belum lengkap</Badge> : <Badge variant="outline">Belum login</Badge>}
                    </TableCell>
                    <TableCell>{c.used_at ? new Date(c.used_at).toLocaleDateString("id-ID") : "-"}</TableCell>
                    <TableCell>
                      <button onClick={() => onEditExpiry(c.id, c.expires_at)} className="text-left text-sm hover:underline">
                        {c.expires_at ? (
                          <span className={new Date(c.expires_at).getTime() < Date.now() ? "text-destructive" : ""}>
                            {new Date(c.expires_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                            {new Date(c.expires_at).getTime() < Date.now() ? " (kedaluwarsa)" : ""}
                          </span>
                        ) : <span className="text-muted-foreground">Tanpa batas</span>}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        <Switch checked={c.active} disabled={togglingId === c.id} onCheckedChange={(v) => onToggle(c.id, v)} aria-label={`Aktifkan kode ${c.code}`} />
                        <span className={`text-[10px] font-medium ${c.active ? "text-success" : "text-muted-foreground"}`}>{c.active ? "Aktif" : "Off"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => onDelete(c.id, c.code)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {codes.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Belum ada kode. Klik "Buat Kode" untuk mulai.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


/** Pemilih jalur kandidat (Magang / Karyawan) untuk pembuatan kode. */
function TypePicker({ value, onChange }: { value: CandidateType; onChange: (v: CandidateType) => void }) {
  return (
    <div className="flex gap-2">
      {CANDIDATE_TYPES.map((t) => (
        <Button
          key={t}
          type="button"
          size="sm"
          variant={value === t ? "default" : "outline"}
          className="flex-1"
          onClick={() => onChange(t)}
        >
          {candidateTypeShort(t)}
        </Button>
      ))}
    </div>
  );
}
