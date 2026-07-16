import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createCandidateCode, deleteCode, listCandidateCodes, toggleCode } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Copy, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/codes")({ component: CodesPage });

function CodesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listCandidateCodes);
  const create = useServerFn(createCandidateCode);
  const toggle = useServerFn(toggleCode);
  const del = useServerFn(deleteCode);
  const { data } = useQuery({ queryKey: ["codes"], queryFn: () => list({ data: {} as never }) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ candidate_name: "", candidate_email: "", position_applied: "", code: "" });
  const [saving, setSaving] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await create({ data: form });
      toast.success(`Kode dibuat: ${res.code.code}`);
      qc.invalidateQueries({ queryKey: ["codes"] });
      setOpen(false);
      setForm({ candidate_name: "", candidate_email: "", position_applied: "", code: "" });
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Kode Kandidat</h1>
          <p className="text-muted-foreground">Buat kode akses untuk kandidat login ke portal test.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Buat Kode</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Buat Kode Kandidat</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-2"><Label>Nama Kandidat *</Label><Input required value={form.candidate_name} onChange={(e) => setForm({ ...form, candidate_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.candidate_email} onChange={(e) => setForm({ ...form, candidate_email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Posisi Dilamar</Label><Input value={form.position_applied} onChange={(e) => setForm({ ...form, position_applied: e.target.value })} /></div>
              <div className="space-y-2"><Label>Kode Custom (opsional)</Label><Input placeholder="Kosongkan untuk auto-generate" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
              <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Membuat..." : "Buat"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Belum ada kode. Klik "Buat Kode" untuk mulai.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
