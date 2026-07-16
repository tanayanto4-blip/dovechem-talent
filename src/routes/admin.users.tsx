import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createAdminUser, deleteAdminUser, listAdminUsers, resetUserPassword } from "@/lib/users.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

function UsersPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminUsers);
  const createFn = useServerFn(createAdminUser);
  const deleteFn = useServerFn(deleteAdminUser);
  const resetFn = useServerFn(resetUserPassword);
  const { data } = useQuery({ queryKey: ["admin-users"], queryFn: () => listFn({ data: {} as never }) });

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", username: "", email: "", password: "", role: "hr" as "hr" | "admin" });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createFn({ data: form });
      toast.success(`User ${form.email} berhasil dibuat`);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setOpen(false);
      setForm({ full_name: "", username: "", email: "", password: "", role: "hr" });
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function onReset(id: string, email: string) {
    const pw = prompt(`Reset password untuk ${email}. Password baru (min 8 karakter):`);
    if (!pw || pw.length < 8) { if (pw !== null) toast.error("Password minimal 8 karakter"); return; }
    try { await resetFn({ data: { id, password: pw } }); toast.success("Password direset"); }
    catch (err: any) { toast.error(err.message); }
  }

  async function onDelete(id: string, email: string) {
    if (!confirm(`Hapus akun ${email}?`)) return;
    try {
      await deleteFn({ data: { id } });
      toast.success("User dihapus");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Manajemen User</h1>
          <p className="text-muted-foreground">Buat dan kelola akun Admin / HR yang bisa login ke panel.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Buat User</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Buat User Baru</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-2"><Label>Nama Lengkap</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Username</Label><Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Password (min 8)</Label><Input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "hr" | "admin" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hr">HR (kelola kandidat)</SelectItem>
                    <SelectItem value="admin">Admin (akses penuh)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Membuat..." : "Buat"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle>Daftar User</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Login Terakhir</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.users ?? []).map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.profile?.full_name ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">@{u.profile?.username ?? "-"}</div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="space-x-1">
                      {u.roles.map((r: string) => <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("id-ID") : "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => onReset(u.id, u.email)} title="Reset password"><KeyRound className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => onDelete(u.id, u.email)} title="Hapus"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(data?.users ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Belum ada user.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
