import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { candidateGetProfile, candidateUploadFile } from "@/lib/candidate.functions";
import { useCandidateSession } from "@/lib/candidate-session";
import { computeChecklist } from "@/lib/document-checklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Upload, FileText, XCircle } from "lucide-react";
import { useRef, useState } from "react";

const FILE_TYPES = [
  { key: "ktp", label: "KTP", desc: "Foto/scan KTP yang masih berlaku", required: true },
  { key: "kk", label: "Kartu Keluarga", desc: "Scan KK terbaru", required: true },
  { key: "cv", label: "Curriculum Vitae (CV)", desc: "PDF, maksimal 10MB", required: true },
  { key: "ijazah", label: "Ijazah", desc: "Ijazah pendidikan terakhir", required: true },
  { key: "transkrip", label: "Transkrip Nilai", desc: "Transkrip pendidikan terakhir", required: true },
  { key: "foto", label: "Pas Foto", desc: "Pas foto formal terbaru", required: false },
  { key: "npwp", label: "NPWP", desc: "Opsional", required: false },
] as const;

export const Route = createFileRoute("/candidate/portal/berkas")({ component: BerkasPage });

function BerkasPage() {
  const session = useCandidateSession();
  const qc = useQueryClient();
  const getProfile = useServerFn(candidateGetProfile);
  const upload = useServerFn(candidateUploadFile);
  const { data } = useQuery({
    queryKey: ["candidate-profile", session?.code],
    queryFn: () => getProfile({ data: { code: session!.code } }),
    enabled: !!session,
  });
  const files = (data?.files ?? []) as any[];
  const uploaded = new Map(files.map((f: any) => [f.file_type, f]));
  const checklist = computeChecklist(files);

  async function handleFile(type: string, file: File) {
    if (file.size > 10 * 1024 * 1024) { toast.error("Ukuran maksimal 10MB"); return; }
    const buf = await file.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    try {
      await upload({ data: {
        code: session!.code,
        file_type: type as any,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        file_size: file.size,
        base64: b64,
      }});
      toast.success(`${type.toUpperCase()} berhasil diunggah`);
      qc.invalidateQueries({ queryKey: ["candidate-profile"] });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Checklist Dokumen Wajib</span>
            {checklist.complete
              ? <Badge className="bg-success">Lengkap</Badge>
              : <Badge variant="secondary">{checklist.done}/{checklist.total}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
            {checklist.items.map((i) => (
              <div
                key={i.key}
                className={`flex items-center gap-2 rounded-md border p-2 text-sm ${i.uploaded ? "border-success/40 bg-success/5" : "border-muted"}`}
              >
                {i.uploaded ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                <span className={i.uploaded ? "font-medium" : "text-muted-foreground"}>{i.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display">Upload Berkas</CardTitle>
          <p className="text-sm text-muted-foreground">Format: PDF/JPG/PNG. Maksimal 10 MB per file.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {FILE_TYPES.map((ft) => (
            <FileRow key={ft.key} ft={ft} existing={uploaded.get(ft.key)} onFile={(f: File) => handleFile(ft.key, f)} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function FileRow({ ft, existing, onFile }: any) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-md ${existing ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
          {existing ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
        </div>
        <div>
          <div className="font-medium">{ft.label} {ft.required && <span className="text-xs text-destructive">*</span>}</div>
          <div className="text-xs text-muted-foreground">{existing ? existing.file_name : ft.desc}</div>
        </div>
      </div>
      <input ref={ref} type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        setBusy(true); await onFile(f); setBusy(false);
        if (ref.current) ref.current.value = "";
      }} />
      <Button size="sm" variant={existing ? "outline" : "default"} onClick={() => ref.current?.click()} disabled={busy}>
        <Upload className="mr-2 h-3.5 w-3.5" /> {busy ? "Mengunggah..." : existing ? "Ganti" : "Unggah"}
      </Button>
    </div>
  );
}
