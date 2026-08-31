import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getCandidateDetail,
  getFileSignedUrl,
  listCandidateFileVersions,
} from "@/lib/admin.functions";
import { candidateTrackOf, jobLevelLabel } from "@/lib/candidate-type";
import { TestAccessControl } from "@/components/test-access-control";
import { CandidateEditPanel } from "@/components/candidate-edit-panel";
import { useIsAdmin } from "@/components/publish-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, History, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/admin/candidates/$id")({
  head: () => ({
    meta: [
      { title: "Detail Kandidat — Admin Dover Chemical" },
      {
        name: "description",
        content:
          "Lihat biodata lengkap, riwayat pengerjaan, dan hasil psikotest satu kandidat PT Dover Chemical.",
      },
      { property: "og:title", content: "Detail Kandidat — Admin Dover Chemical" },
      {
        property: "og:description",
        content:
          "Lihat biodata lengkap, riwayat pengerjaan, dan hasil psikotest satu kandidat PT Dover Chemical.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CandidateDetail,
});

function CandidateDetail() {
  const { id } = Route.useParams();
  const isAdmin = useIsAdmin();
  const detail = useServerFn(getCandidateDetail);
  const signed = useServerFn(getFileSignedUrl);
  const versionsFn = useServerFn(listCandidateFileVersions);
  const { data } = useQuery({
    queryKey: ["candidate", id],
    queryFn: () => detail({ data: { id } }),
  });
  const { data: vData } = useQuery({
    queryKey: ["candidate-file-versions", id],
    queryFn: () => versionsFn({ data: { candidate_id: id } }),
  });
  const versions = (vData?.versions ?? []) as any[];
  const groupedVersions = versions.reduce<Record<string, any[]>>((acc, v) => {
    (acc[v.file_type] ||= []).push(v);
    return acc;
  }, {});
  const c = data?.candidate as any;

  async function openFile(path: string) {
    const { url } = await signed({ data: { path } });
    window.open(url, "_blank");
  }

  if (!c) return <div className="text-muted-foreground">Memuat...</div>;

  const isMagang = candidateTrackOf(c) === "magang";


  const Field = ({ label, value }: { label: string; value: any }) => (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value ?? "-"}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/candidates">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Link>
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">
            {c.full_name ?? "Kandidat"}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{c.candidate_codes?.code ?? c.code_snapshot ?? "-"}</span>
            {c.data_completed ? (
              <Badge className="bg-success">Data lengkap</Badge>
            ) : (
              <Badge variant="secondary">Belum lengkap</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CandidateEditPanel candidate={c} isMagang={candidateTrackOf(c) === "magang"} />
          <Button asChild size="sm">
            <Link to="/admin/pendampingan/$candidateId" params={{ candidateId: id }}>
              <ClipboardList className="mr-2 h-4 w-4" /> Bantu Isi Test
            </Link>
          </Button>
        </div>
      </div>

      <TestAccessControl candidateId={id} />


      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Data Diri</span>
            <Badge variant="secondary">{isMagang ? "Magang" : "Karyawan"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="Nama Lengkap" value={c.full_name} />
          <Field label="Jenis Kelamin" value={c.gender} />
          <Field label="Usia" value={c.age ? `${c.age} tahun` : null} />
          <Field label="Nama Sekolah / Universitas" value={c.school_name} />
          <Field label="Pendidikan" value={c.education} />
          <Field label="Jurusan" value={c.major} />
          <Field label="Telp / HP" value={c.phone} />
          <Field label="Email" value={c.email} />
          <Field label="Posisi Dilamar" value={c.position_applied} />
          {!isMagang && <Field label="Pernah Bekerja" value={c.work_experience} />}
          {!isMagang && <Field label="Posisi Jabatan" value={c.job_position} />}
          {!isMagang && (
            <Field
              label="Tingkat Jabatan"
              value={c.job_level ? jobLevelLabel(c.job_level) : null}
            />
          )}
        </CardContent>
      </Card>


      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Berkas Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {(c.candidate_files ?? []).length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Belum ada berkas.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {c.candidate_files.map((f: any) => {
                const vs = groupedVersions[f.file_type] ?? [];
                const currentV = vs[0]?.version;
                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs uppercase text-secondary">
                        <span>{f.file_type}</span>
                        {currentV ? (
                          <Badge variant="outline" className="text-[10px]">
                            v{currentV}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-sm font-medium">{f.file_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round((f.file_size ?? 0) / 1024)} KB · diunggah{" "}
                        {new Date(f.uploaded_at).toLocaleString("id-ID")}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openFile(f.file_path)}>
                      <Download className="mr-2 h-3.5 w-3.5" /> Buka
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Riwayat Unggahan Dokumen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Belum ada riwayat unggahan.
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(groupedVersions).map(([ft, list]) => (
                <div key={ft}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-secondary">
                    {ft} · {list.length} versi
                  </div>
                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">Versi</th>
                          <th className="px-3 py-2 text-left">Nama File</th>
                          <th className="px-3 py-2 text-left">Ukuran</th>
                          <th className="px-3 py-2 text-left">Waktu Upload</th>
                          <th className="px-3 py-2 text-left">Pengunggah</th>
                          <th className="px-3 py-2 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((v: any, idx: number) => (
                          <tr key={v.id} className="border-t">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono">v{v.version}</span>
                                {idx === 0 ? (
                                  <Badge className="bg-success text-[10px]">Terkini</Badge>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-3 py-2">{v.file_name}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {Math.round((v.file_size ?? 0) / 1024)} KB
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {new Date(v.uploaded_at).toLocaleString("id-ID")}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <span>{v.uploader_label ?? "-"}</span>
                                <span className="text-xs uppercase text-muted-foreground">
                                  {v.uploader_kind}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openFile(v.file_path)}
                              >
                                <Download className="mr-2 h-3.5 w-3.5" /> Buka
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Hasil Psikotest</CardTitle>
        </CardHeader>
        <CardContent>
          {(c.test_attempts ?? []).length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Belum ada test yang dikerjakan.
            </div>
          ) : (
            <div className="space-y-3">
              {c.test_attempts.map((a: any) => (
                <div key={a.id} className="rounded-md border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{a.tests?.name}</div>
                      <div className="text-xs text-muted-foreground uppercase">
                        {a.tests?.test_type}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={a.status === "finished" ? "bg-success" : ""}
                        variant={a.status === "finished" ? "default" : "secondary"}
                      >
                        {a.status === "finished" ? `Skor: ${a.score}` : "In progress"}
                      </Badge>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/admin/attempts/$id" params={{ id: a.id }}>
                          Lihat Jawaban
                        </Link>
                      </Button>
                    </div>
                  </div>
                  {a.result && a.tests?.test_type === "disc" && a.result.most ? (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Profil DISC — Dominan:{" "}
                        <span className="text-primary">{a.result.dominant}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        {(["D", "I", "S", "C"] as const).map((k) => (
                          <div key={k} className="rounded border bg-muted/40 p-2">
                            <div className="text-lg font-bold text-primary">{k}</div>
                            <div>
                              Most: <b>{a.result.most?.[k] ?? 0}</b>
                            </div>
                            <div>
                              Least: <b>{a.result.least?.[k] ?? 0}</b>
                            </div>
                            <div>
                              Change: <b>{a.result.change?.[k] ?? 0}</b>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : a.result ? (
                    <pre className="mt-3 overflow-x-auto rounded bg-muted p-2 text-xs">
                      {JSON.stringify(a.result, null, 2)}
                    </pre>
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
