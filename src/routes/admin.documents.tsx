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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, ExternalLink, Eye, FileArchive, FileText, FolderOpen, Search } from "lucide-react";
import { toast } from "sonner";

function mimeKind(name: string, mime?: string | null): "image" | "pdf" | "other" {
  const m = (mime ?? "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m === "application/pdf") return "pdf";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "other";
}

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

  const [previewing, setPreviewing] = useState<null | { file: any; url: string; kind: "image" | "pdf" | "other" }>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  async function preview(f: any) {
    const kind = mimeKind(f.file_name, f.mime_type);
    setPreviewLoading(f.id);
    try {
      const { url } = await signed({ data: { path: f.file_path } });
      setPreviewing({ file: f, url, kind });
    } finally {
      setPreviewLoading(null);
    }
  }

  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  function safeName(s: string) {
    return (s || "unknown").replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_").slice(0, 80);
  }

  async function downloadZip() {
    if (filtered.length === 0 || zipping) return;
    setZipping(true);
    setZipProgress(0);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const used = new Set<string>();
      let done = 0;
      for (const f of filtered) {
        try {
          const { url } = await signed({ data: { path: f.file_path } });
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = await res.arrayBuffer();
          const folder = safeName(f.candidates?.full_name ?? "tanpa-nama");
          let name = `${safeName(f.file_type || "file")}__${safeName(f.file_name)}`;
          let path = `${folder}/${name}`;
          let i = 1;
          while (used.has(path)) { path = `${folder}/${i++}_${name}`; }
          used.add(path);
          zip.file(path, buf);
        } catch (e) {
          console.warn("Gagal mengunduh:", f.file_name, e);
        } finally {
          done += 1;
          setZipProgress(Math.round((done / filtered.length) * 100));
        }
      }
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const a = document.createElement("a");
      const href = URL.createObjectURL(blob);
      a.href = href;
      a.download = `bank-dokumen-kandidat_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      toast.success(`ZIP siap · ${used.size} berkas`);
    } catch (e: any) {
      toast.error(`Gagal membuat ZIP: ${e?.message ?? e}`);
    } finally {
      setZipping(false);
      setZipProgress(0);
    }
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
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => preview(f)}
                            disabled={previewLoading === f.id}
                          >
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            {previewLoading === f.id ? "Memuat..." : "Preview"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => open(f.file_path)}>
                            <Download className="mr-2 h-3.5 w-3.5" /> Buka
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 pr-6">
              <span className="truncate">
                {previewing?.file?.file_name ?? "Preview"}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {previewing?.file?.candidates?.full_name ? `· ${previewing.file.candidates.full_name}` : ""}
                </span>
              </span>
              {previewing && (
                <a
                  href={previewing.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Buka di tab baru
                </a>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewing && (
            <div className="h-[75vh] w-full overflow-auto rounded-md bg-muted/30">
              {previewing.kind === "image" ? (
                <img
                  src={previewing.url}
                  alt={previewing.file.file_name}
                  className="mx-auto h-full w-auto object-contain"
                />
              ) : previewing.kind === "pdf" ? (
                <iframe
                  src={previewing.url}
                  title={previewing.file.file_name}
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
                  <FileText className="h-8 w-8 opacity-50" />
                  Format berkas ini tidak dapat ditampilkan langsung.
                  <a href={previewing.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    Unduh / buka di tab baru
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
