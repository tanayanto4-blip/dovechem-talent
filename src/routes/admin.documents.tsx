import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listAllCandidateFiles, getFileSignedUrl } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, FolderOpen, Search } from "lucide-react";

export const Route = createFileRoute("/admin/documents")({
  component: DocumentsBank,
  head: () => ({
    meta: [
      { title: "Bank Dokumen Kandidat — Dover Chemical HR" },
      { name: "description", content: "Pusat berkas seluruh kandidat: KTP, KK, CV, ijazah, transkrip, dan dokumen pendukung lainnya." },
    ],
  }),
});

function humanSize(bytes?: number | null) {
  if (!bytes && bytes !== 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function DocumentsBank() {
  const listFn = useServerFn(listAllCandidateFiles);
  const signed = useServerFn(getFileSignedUrl);
  const { data, isLoading } = useQuery({
    queryKey: ["all-candidate-files"],
    queryFn: () => listFn({ data: {} as never }),
  });

  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");

  const files = (data?.files ?? []) as any[];
  const types = useMemo(() => {
    const s = new Set<string>();
    files.forEach((f) => f.file_type && s.add(f.file_type));
    return Array.from(s).sort();
  }, [files]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return files.filter((f) => {
      if (type !== "all" && f.file_type !== type) return false;
      if (!needle) return true;
      const hay = [
        f.file_name,
        f.file_type,
        f.candidates?.full_name,
        f.candidates?.nik,
        f.candidates?.position_applied,
        f.candidates?.candidate_codes?.code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [files, q, type]);

  async function open(path: string) {
    const { url } = await signed({ data: { path } });
    window.open(url, "_blank");
  }

  const totalSize = filtered.reduce((s, f) => s + (f.file_size ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Bank Dokumen Kandidat</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seluruh berkas yang diunggah kandidat (KTP, KK, CV, ijazah, transkrip, dll.) tersedia otomatis di sini.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <Badge variant="secondary" className="gap-1"><FolderOpen className="h-3 w-3" /> {filtered.length} berkas</Badge>
          <Badge variant="secondary">{humanSize(totalSize)}</Badge>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">Daftar Berkas</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NIK, kode, tipe..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-64 pl-8"
              />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Semua tipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua tipe</SelectItem>
                {types.map((t) => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Memuat berkas...</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <FileText className="mx-auto mb-2 h-6 w-6 opacity-50" />
              Belum ada berkas yang cocok.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kandidat</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Nama Berkas</TableHead>
                    <TableHead>Ukuran</TableHead>
                    <TableHead>Diunggah</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <Link
                          to="/admin/candidates/$id"
                          params={{ id: f.candidate_id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {f.candidates?.full_name ?? "(tanpa nama)"}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {f.candidates?.position_applied ?? "-"}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{f.candidates?.candidate_codes?.code ?? "-"}</TableCell>
                      <TableCell><Badge variant="outline" className="uppercase">{f.file_type}</Badge></TableCell>
                      <TableCell className="max-w-[260px] truncate" title={f.file_name}>{f.file_name}</TableCell>
                      <TableCell className="text-xs">{humanSize(f.file_size)}</TableCell>
                      <TableCell className="text-xs">{new Date(f.uploaded_at).toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => open(f.file_path)}>
                          <Download className="mr-2 h-3.5 w-3.5" /> Buka
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
