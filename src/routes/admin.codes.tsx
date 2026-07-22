import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { bulkCreateCandidateCodes, bulkSetCodesActive, bulkSetCodesExpiry, createCandidateCode, deleteCode, listCandidateCodes, setCodeExpiry, toggleCode } from "@/lib/admin.functions";
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

export const Route = createFileRoute("/admin/codes")({ component: CodesPage });

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
  const { data } = useQuery({ queryKey: ["codes"], queryFn: () => list({ data: {} as never }) });
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [expiryValue, setExpiryValue] = useState("");
  const [editExpiry, setEditExpiry] = useState<{ id: string; value: string } | null>(null);
  const [form, setForm] = useState({ candidate_name: "", candidate_email: "", position_applied: "", code: "", expires_at: "" });
  const [bulkForm, setBulkForm] = useState({ count: 300, prefix: "DOV", name_prefix: "Kandidat", position_applied: "", start_number: 1, expires_at: "" });
  const [autoForm, setAutoForm] = useState({ count: 300, expires_at: "" });
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

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
      setForm({ candidate_name: "", candidate_email: "", position_applied: "", code: "", expires_at: "" });
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
      }});
      toast.success(`${res.created} kode dibuat & aktif`);
      qc.invalidateQueries({ queryKey: ["codes"] });
      setBulkOpen(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setBulkSaving(false); }
  }

  async function onBulkExpiry() {
    const v = prompt("Set masa berlaku SEMUA kode (YYYY-MM-DDTHH:mm). Kosongkan lalu OK untuk hapus batas:", "");
    if (v === null) return;
    const iso = v ? toIso(v) : null;
    if (v && !iso) { toast.error("Format tanggal tidak valid"); return; }
    try {
      const res = await bulkExpiry({ data: { expires_at: iso } });
      toast.success(`${res.updated} kode diperbarui`);
      qc.invalidateQueries({ queryKey: ["codes"] });
    } catch (e: any) { toast.error(e.message); }
  }

  async function onEditExpiry(id: string, current: string | null) {
    const cur = current ? new Date(current).toISOString().slice(0, 16) : "";
    const v = prompt("Masa berlaku (YYYY-MM-DDTHH:mm). Kosongkan lalu OK untuk hapus batas:", cur);
    if (v === null) return;
    const iso = v ? toIso(v) : null;
    if (v && !iso) { toast.error("Format tanggal tidak valid"); return; }
    try {
      await setExpiry({ data: { id, expires_at: iso } });
      qc.invalidateQueries({ queryKey: ["codes"] });
      toast.success("Masa berlaku diperbarui");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Kode Kandidat</h1>
          <p className="text-muted-foreground">Buat kode akses untuk kandidat login ke portal test.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onAuto} disabled={autoSaving} className="bg-gradient-to-r from-primary to-primary-glow">
            <Zap className="mr-2 h-4 w-4" /> {autoSaving ? "Membuat..." : "Otomatis Buat Kode"}
          </Button>
          <Button variant="outline" onClick={() => onBulkActive(true)}><Power className="mr-2 h-4 w-4" /> Aktifkan Semua</Button>
          <Button variant="outline" onClick={() => onBulkActive(false)}><PowerOff className="mr-2 h-4 w-4" /> Nonaktifkan Semua</Button>
          <Button variant="outline" onClick={onBulkExpiry}><CalendarClock className="mr-2 h-4 w-4" /> Set Masa Berlaku Semua</Button>
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild><Button variant="secondary"><Layers className="mr-2 h-4 w-4" /> Buat Massal</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Buat Kode Massal</DialogTitle></DialogHeader>
              <form onSubmit={onBulk} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Jumlah *</Label><Input type="number" min={1} max={1000} required value={bulkForm.count} onChange={(e) => setBulkForm({ ...bulkForm, count: Number(e.target.value) })} /></div>
                  <div className="space-y-2"><Label>Mulai Nomor</Label><Input type="number" min={1} value={bulkForm.start_number} onChange={(e) => setBulkForm({ ...bulkForm, start_number: Number(e.target.value) })} /></div>
                </div>
                <div className="space-y-2"><Label>Prefix Kode</Label><Input value={bulkForm.prefix} onChange={(e) => setBulkForm({ ...bulkForm, prefix: e.target.value.toUpperCase() })} placeholder="DOV" /></div>
                <div className="space-y-2"><Label>Prefix Nama Kandidat</Label><Input value={bulkForm.name_prefix} onChange={(e) => setBulkForm({ ...bulkForm, name_prefix: e.target.value })} placeholder="Kandidat" /></div>
                <div className="space-y-2"><Label>Posisi Dilamar</Label><Input value={bulkForm.position_applied} onChange={(e) => setBulkForm({ ...bulkForm, position_applied: e.target.value })} /></div>
                <div className="space-y-2"><Label>Masa Berlaku (opsional)</Label><Input type="datetime-local" value={bulkForm.expires_at} onChange={(e) => setBulkForm({ ...bulkForm, expires_at: e.target.value })} /><p className="text-[11px] text-muted-foreground">Kosongkan jika tanpa batas waktu.</p></div>
                <p className="text-xs text-muted-foreground">Semua kode dibuat dalam status <b>aktif</b> dan langsung bisa dipakai kandidat login.</p>
                <DialogFooter><Button type="submit" disabled={bulkSaving}>{bulkSaving ? "Membuat..." : `Buat ${bulkForm.count} Kode`}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Buat Kode</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Buat Kode Kandidat</DialogTitle></DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <div className="space-y-2"><Label>Nama Kandidat *</Label><Input required value={form.candidate_name} onChange={(e) => setForm({ ...form, candidate_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.candidate_email} onChange={(e) => setForm({ ...form, candidate_email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Posisi Dilamar</Label><Input value={form.position_applied} onChange={(e) => setForm({ ...form, position_applied: e.target.value })} /></div>
                <div className="space-y-2"><Label>Kode Custom (opsional)</Label><Input placeholder="Kosongkan untuk auto-generate" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
                <div className="space-y-2"><Label>Masa Berlaku (opsional)</Label><Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
                <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Membuat..." : "Buat"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle>Daftar Kode</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Kandidat</TableHead>
                  <TableHead>Posisi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Digunakan</TableHead>
                  <TableHead>Masa Berlaku</TableHead>
                  <TableHead>Aktif</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.codes ?? []).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="flex items-center gap-2 font-mono font-semibold">
                      {c.code}
                      <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Kode disalin"); }} className="text-muted-foreground hover:text-primary">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{c.candidate_name}</div>
                      <div className="text-xs text-muted-foreground">{c.candidate_email}</div>
                    </TableCell>
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
                      <Switch checked={c.active} onCheckedChange={async (v) => { await toggle({ data: { id: c.id, active: v } }); qc.invalidateQueries({ queryKey: ["codes"] }); }} />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={async () => {
                        if (!confirm(`Hapus kode ${c.code}? Data kandidat terkait juga akan terhapus.`)) return;
                        await del({ data: { id: c.id } });
                        qc.invalidateQueries({ queryKey: ["codes"] });
                        toast.success("Kode dihapus");
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(data?.codes ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Belum ada kode. Klik "Buat Kode" untuk mulai.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
