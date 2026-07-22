import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCandidateDetail, getFileSignedUrl } from "@/lib/admin.functions";
import { computeChecklist } from "@/lib/document-checklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Download, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/candidates/$id")({ component: CandidateDetail });

function CandidateDetail() {
  const { id } = Route.useParams();
  const detail = useServerFn(getCandidateDetail);
  const signed = useServerFn(getFileSignedUrl);
  const { data } = useQuery({ queryKey: ["candidate", id], queryFn: () => detail({ data: { id } }) });
  const c = data?.candidate as any;

  async function openFile(path: string) {
    const { url } = await signed({ data: { path } });
    window.open(url, "_blank");
  }

  if (!c) return <div className="text-muted-foreground">Memuat...</div>;

  const Field = ({ label, value }: { label: string; value: any }) => (
    <div><div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div><div className="mt-1 font-medium">{value ?? "-"}</div></div>
  );

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to="/admin/candidates"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Link></Button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">{c.full_name ?? "Kandidat"}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{c.candidate_codes?.code}</span>
            {c.data_completed ? <Badge className="bg-success">Data lengkap</Badge> : <Badge variant="secondary">Belum lengkap</Badge>}
          </div>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle>Data Diri</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="NIK" value={c.nik} />
          <Field label="Tempat/Tgl Lahir" value={`${c.birth_place ?? "-"} / ${c.birth_date ?? "-"}`} />
          <Field label="Jenis Kelamin" value={c.gender} />
          <Field label="Email" value={c.email} />
          <Field label="No HP" value={c.phone} />
          <Field label="Status" value={c.marital_status} />
          <Field label="Pendidikan" value={c.education} />
          <Field label="Posisi" value={c.position_applied} />
          <Field label="Alamat" value={c.address} />
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle>Berkas Upload</CardTitle></CardHeader>
        <CardContent>
          {(c.candidate_files ?? []).length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Belum ada berkas.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {c.candidate_files.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-xs uppercase text-secondary">{f.file_type}</div>
                    <div className="text-sm font-medium">{f.file_name}</div>
                    <div className="text-xs text-muted-foreground">{Math.round((f.file_size ?? 0) / 1024)} KB</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openFile(f.file_path)}><Download className="mr-2 h-3.5 w-3.5" /> Buka</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle>Hasil Psikotest</CardTitle></CardHeader>
        <CardContent>
          {(c.test_attempts ?? []).length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Belum ada test yang dikerjakan.</div>
          ) : (
            <div className="space-y-3">
              {c.test_attempts.map((a: any) => (
                <div key={a.id} className="rounded-md border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{a.tests?.name}</div>
                      <div className="text-xs text-muted-foreground uppercase">{a.tests?.test_type}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={a.status === "finished" ? "bg-success" : ""} variant={a.status === "finished" ? "default" : "secondary"}>
                        {a.status === "finished" ? `Skor: ${a.score}` : "In progress"}
                      </Badge>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/admin/attempts/$id" params={{ id: a.id }}>Lihat Jawaban</Link>
                      </Button>
                    </div>
                  </div>
                  {a.result && a.tests?.test_type === "disc" && a.result.most ? (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">Profil DISC — Dominan: <span className="text-primary">{a.result.dominant}</span></div>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        {(["D","I","S","C"] as const).map((k) => (
                          <div key={k} className="rounded border bg-muted/40 p-2">
                            <div className="text-lg font-bold text-primary">{k}</div>
                            <div>Most: <b>{a.result.most?.[k] ?? 0}</b></div>
                            <div>Least: <b>{a.result.least?.[k] ?? 0}</b></div>
                            <div>Change: <b>{a.result.change?.[k] ?? 0}</b></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : a.result ? (
                    <pre className="mt-3 overflow-x-auto rounded bg-muted p-2 text-xs">{JSON.stringify(a.result, null, 2)}</pre>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
