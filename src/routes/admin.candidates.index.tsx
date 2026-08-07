import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCandidates, deleteCandidate } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/candidates/")({ head: () => ({ meta: [
    { title: "Daftar Kandidat — Admin Dover Chemical" },
    { name: "description", content: "Kelola daftar kandidat rekrutmen PT Dover Chemical beserta biodata dan status pengerjaan test." },
    { property: "og:title", content: "Daftar Kandidat — Admin Dover Chemical" },
    { property: "og:description", content: "Kelola daftar kandidat rekrutmen PT Dover Chemical beserta biodata dan status pengerjaan test." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: CandidatesList });

function CandidatesList() {
  const listFn = useServerFn(listCandidates);
  const deleteFn = useServerFn(deleteCandidate);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["candidates"], queryFn: () => listFn({ data: { limit: 1000 } }) });
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteFn({ data: { id: toDelete.id } });
      await qc.invalidateQueries({ queryKey: ["candidates"] });
      await qc.invalidateQueries({ queryKey: ["admin-all-attempts"] });
      toast.success(`Kandidat ${toDelete.full_name ?? ""} dihapus`);
      setToDelete(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menghapus kandidat");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">Kandidat</h1>
        <p className="text-muted-foreground">Daftar seluruh kandidat yang telah login menggunakan kode akses.</p>
      </div>
      <Card className="shadow-card">
        <CardHeader><CardTitle>Semua Kandidat</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>No. HP</TableHead>
                  <TableHead>Pendidikan</TableHead>
                  <TableHead>Posisi</TableHead>
                  <TableHead>Biodata</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.candidates ?? []).map((c: any) => {
                  const finished = (c.test_attempts ?? []).filter((a: any) => a.status === "finished").length;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.full_name ?? "-"}</div>
                        <div className="text-xs text-muted-foreground">{c.email ?? ""}</div>
                      </TableCell>
                      <TableCell className="font-mono">{c.candidate_codes?.code ?? c.code_snapshot ?? "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{c.nik ?? "-"}</TableCell>
                      <TableCell className="text-sm">{c.phone ?? "-"}</TableCell>
                      <TableCell className="text-sm">{c.education ?? "-"}</TableCell>
                      <TableCell>{c.position_applied ?? "-"}</TableCell>
                      <TableCell>{c.data_completed ? <Badge className="bg-success">Lengkap</Badge> : <Badge variant="secondary">Belum</Badge>}</TableCell>
                      <TableCell>{finished} selesai</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline"><Link to="/admin/candidates/$id" params={{ id: c.id }}>Detail</Link></Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Hapus kandidat ${c.full_name ?? ""}`}
                            title="Hapus kandidat ini"
                            onClick={() => setToDelete(c)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {(data?.candidates ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Belum ada kandidat yang login.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kandidat?</AlertDialogTitle>
            <AlertDialogDescription>
              Data kandidat {toDelete?.full_name ?? "ini"} beserta biodata, berkas, dan seluruh hasil test akan dihapus
              permanen. Kode akses tetap tersimpan dan dapat digunakan kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Menghapus..." : "Hapus kandidat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
