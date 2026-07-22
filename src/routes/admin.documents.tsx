import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Fragment as FragmentWithKey, useMemo, useState } from "react";
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
  const [zippingCandidate, setZippingCandidate] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());


  function safeName(s: string) {
    return (s || "unknown").replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_").slice(0, 80);
  }

  async function buildZip(items: any[], zipName: string, onProgress?: (p: number) => void) {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const used = new Set<string>();
    const manifestRows: Array<Record<string, string>> = [];
    let done = 0;
    for (const f of items) {
      const folder = safeName(f.candidates?.full_name ?? "tanpa-nama");
      const name = `${safeName(f.file_type || "file")}__${safeName(f.file_name)}`;
      let path = `${folder}/${name}`;
      let i = 1;
      while (used.has(path)) { path = `${folder}/${i++}_${name}`; }
      let status = "ok";
      try {
        const { url } = await signed({ data: { path: f.file_path } });
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        used.add(path);
        zip.file(path, buf);
      } catch (e: any) {
        status = `failed: ${e?.message ?? e}`;
        console.warn("Gagal mengunduh:", f.file_name, e);
      } finally {
        manifestRows.push({
          candidate_name: f.candidates?.full_name ?? "",
          candidate_nik: f.candidates?.nik ?? "",
          candidate_code: f.candidates?.candidate_codes?.code ?? "",
          position: f.candidates?.position_applied ?? "",
          file_type: f.file_type ?? "",
          file_name: f.file_name ?? "",
          zip_path: status === "ok" ? path : "",
          size_bytes: String(f.file_size ?? ""),
          mime_type: f.mime_type ?? "",
          uploaded_at: f.uploaded_at ?? "",
          status,
        });
        done += 1;
        onProgress?.(Math.round((done / items.length) * 100));
      }
    }
    const headers = Object.keys(manifestRows[0] ?? {
      candidate_name: "", candidate_nik: "", candidate_code: "", position: "",
      file_type: "", file_name: "", zip_path: "", size_bytes: "", mime_type: "", uploaded_at: "", status: "",
    });
    const escape = (v: string) => /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const csv = [headers.join(","), ...manifestRows.map((r) => headers.map((h) => escape(String(r[h] ?? ""))).join(","))].join("\r\n");
    zip.file("manifest.csv", "\uFEFF" + csv);

    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    const a = document.createElement("a");
    const href = URL.createObjectURL(blob);
    a.href = href;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
    return used.size;
  }

  async function downloadZip() {
    if (filtered.length === 0 || zipping) return;
    setZipping(true);
    setZipProgress(0);
    try {
      const count = await buildZip(
        filtered,
        `bank-dokumen-kandidat_${new Date().toISOString().slice(0, 10)}.zip`,
        setZipProgress,
      );
      toast.success(`ZIP siap · ${count} berkas`);
    } catch (e: any) {
      toast.error(`Gagal membuat ZIP: ${e?.message ?? e}`);
    } finally {
      setZipping(false);
      setZipProgress(0);
    }
  }

  async function downloadCandidateZip(candidateId: string) {
    if (zippingCandidate) return;
    const items = files.filter((f) => f.candidate_id === candidateId);
    if (!items.length) return;
    const candidateName = items[0]?.candidates?.full_name ?? "kandidat";
    setZippingCandidate(candidateId);
    try {
      const count = await buildZip(
        items,
        `${safeName(candidateName)}_${new Date().toISOString().slice(0, 10)}.zip`,
      );
      toast.success(`ZIP ${candidateName} siap · ${count} berkas`);
    } catch (e: any) {
      toast.error(`Gagal membuat ZIP: ${e?.message ?? e}`);
    } finally {
      setZippingCandidate(null);
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
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Badge variant="secondary" className="gap-1"><FolderOpen className="h-3 w-3" /> {filtered.length} berkas</Badge>
          <Badge variant="secondary">{humanSize(totalSize)}</Badge>
          <Button
            size="sm"
            onClick={downloadZip}
            disabled={zipping || filtered.length === 0}
            className="gap-2"
          >
            <FileArchive className="h-4 w-4" />
            {zipping ? `Mengemas... ${zipProgress}%` : `Unduh ZIP (${filtered.length})`}
          </Button>
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
                    <TableHead className="w-12">No.</TableHead>
                    <TableHead>Kandidat</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Folder Berkas</TableHead>
                    <TableHead>Total Ukuran</TableHead>
                    <TableHead>Terakhir Unggah</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const groups = new Map<string, any[]>();
                    for (const f of filtered) {
                      const key = f.candidate_id ?? "unknown";
                      if (!groups.has(key)) groups.set(key, []);
                      groups.get(key)!.push(f);
                    }
                    const rows = Array.from(groups.entries()).map(([id, items]) => {
                      const c = items[0]?.candidates;
                      const totalSize = items.reduce((s, f) => s + (f.file_size ?? 0), 0);
                      const last = items.reduce((m, f) => {
                        const t = new Date(f.uploaded_at).getTime();
                        return t > m ? t : m;
                      }, 0);
                      return { id, c, items, totalSize, last };
                    }).sort((a, b) => (a.c?.full_name ?? "").localeCompare(b.c?.full_name ?? ""));
                    return rows.map((r, idx) => {
                      const isOpen = expanded.has(r.id);
                      return (
                        <FragmentWithKey key={r.id}>
                          <TableRow>

                            <TableCell className="text-center font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell>
                              <Link
                                to="/admin/candidates/$id"
                                params={{ id: r.id }}
                                className="font-medium text-primary hover:underline"
                              >
                                {r.c?.full_name ?? "(tanpa nama)"}
                              </Link>
                              <div className="text-xs text-muted-foreground">
                                {r.c?.position_applied ?? "-"}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{r.c?.candidate_codes?.code ?? "-"}</TableCell>
                            <TableCell>
                              <button
                                onClick={() => {
                                  const n = new Set(expanded);
                                  n.has(r.id) ? n.delete(r.id) : n.add(r.id);
                                  setExpanded(n);
                                }}
                                className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-xs hover:bg-muted"
                              >
                                <FolderOpen className="h-3.5 w-3.5 text-primary" />
                                <span className="font-medium">{safeName(r.c?.full_name ?? "kandidat")}/</span>
                                <Badge variant="secondary" className="h-4 px-1 text-[10px]">{r.items.length} berkas</Badge>
                                <span className="text-muted-foreground">{isOpen ? "▾" : "▸"}</span>
                              </button>
                            </TableCell>
                            <TableCell className="text-xs">{humanSize(r.totalSize)}</TableCell>
                            <TableCell className="text-xs">{r.last ? new Date(r.last).toLocaleString("id-ID") : "-"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadCandidateZip(r.id)}
                                disabled={zippingCandidate === r.id}
                              >
                                <FileArchive className="mr-2 h-3.5 w-3.5" />
                                {zippingCandidate === r.id ? "Mengemas..." : "Unduh ZIP"}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isOpen && (
                            <TableRow key={r.id + "-files"} className="bg-muted/20 hover:bg-muted/20">
                              <TableCell></TableCell>
                              <TableCell colSpan={6}>
                                <div className="ml-2 space-y-1 border-l-2 border-primary/30 pl-4 py-2">
                                  {r.items.map((f) => (
                                    <div key={f.id} className="flex items-center justify-between gap-3 rounded px-2 py-1 hover:bg-background">
                                      <div className="flex min-w-0 items-center gap-2">
                                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase">{f.file_type}</Badge>
                                        <span className="truncate text-xs font-medium" title={f.file_name}>{f.file_name}</span>
                                        <span className="shrink-0 text-[11px] text-muted-foreground">{humanSize(f.file_size)}</span>
                                      </div>
                                      <div className="flex shrink-0 gap-1">
                                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => preview(f)} disabled={previewLoading === f.id}>
                                          <Eye className="mr-1 h-3 w-3" />{previewLoading === f.id ? "..." : "Preview"}
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => open(f.file_path)}>
                                          <Download className="mr-1 h-3 w-3" />Buka
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </FragmentWithKey>
                      );
                    });
                  })()}
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
