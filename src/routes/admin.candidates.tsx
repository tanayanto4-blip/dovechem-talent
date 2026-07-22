import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCandidates } from "@/lib/admin.functions";
import { computeChecklist } from "@/lib/document-checklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/candidates")({ component: CandidatesList });

function CandidatesList() {
  const listFn = useServerFn(listCandidates);
  const { data } = useQuery({ queryKey: ["candidates"], queryFn: () => listFn({ data: {} as never }) });

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
                  <TableHead>Posisi</TableHead>
                  <TableHead>Data Diri</TableHead>
                  <TableHead>Berkas Wajib</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.candidates ?? []).map((c: any) => {
                  const finished = (c.test_attempts ?? []).filter((a: any) => a.status === "finished").length;
                  const cl = computeChecklist(c.candidate_files);
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.full_name ?? "-"}</div>
                        <div className="text-xs text-muted-foreground">{c.email ?? ""}</div>
                      </TableCell>
                      <TableCell className="font-mono">{c.candidate_codes?.code}</TableCell>
                      <TableCell>{c.position_applied ?? "-"}</TableCell>
                      <TableCell>{c.data_completed ? <Badge className="bg-success">Lengkap</Badge> : <Badge variant="secondary">Belum</Badge>}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {cl.complete ? (
                            <Badge className="bg-success">Lengkap</Badge>
                          ) : (
                            <Badge variant="secondary">{cl.done}/{cl.total}</Badge>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {cl.items.map((i) => (
                              <span
                                key={i.key}
                                title={`${i.label}: ${i.uploaded ? "sudah" : "belum"}`}
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${i.uploaded ? "bg-success/15 text-success" : "bg-muted text-muted-foreground line-through"}`}
                              >
                                {i.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{finished} selesai</TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="outline"><Link to="/admin/candidates/$id" params={{ id: c.id }}>Detail</Link></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(data?.candidates ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Belum ada kandidat yang login.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
