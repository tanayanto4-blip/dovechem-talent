import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminUpdateCandidateBiodata,
  adminUploadCandidateFile,
} from "@/lib/admin-assist.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Upload } from "lucide-react";
import { toast } from "sonner";

const FILE_TYPES = ["foto", "ktp", "kk", "cv", "ijazah", "transkrip", "npwp"] as const;

const FIELDS: { key: string; label: string; type?: string }[] = [
  { key: "full_name", label: "Nama Lengkap" },
  { key: "gender", label: "Jenis Kelamin (Laki-laki / Perempuan)" },
  { key: "age", label: "Usia", type: "number" },
  { key: "school_name", label: "Nama Sekolah / Universitas" },
  { key: "education", label: "Pendidikan" },
  { key: "major", label: "Jurusan" },
  { key: "phone", label: "Telp / HP" },
  { key: "email", label: "Email" },
  { key: "position_applied", label: "Posisi Dilamar" },
  { key: "work_experience", label: "Pengalaman Kerja" },
  { key: "job_position", label: "Posisi Jabatan" },
];

/** Panel staff untuk memperbaiki data diri kandidat dan mengunggah berkas yang kurang. */
export function CandidateEditPanel({
  candidate,
  isMagang,
}: {
  candidate: any;
  isMagang: boolean;
}) {
  const qc = useQueryClient();
  const updateFn = useServerFn(adminUpdateCandidateBiodata);
  const uploadFn = useServerFn(adminUploadCandidateFile);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [fileType, setFileType] = useState<string>("foto");
  const inputRef = useRef<HTMLInputElement>(null);

  const fields = FIELDS.filter((f) =>
    isMagang ? !["work_experience", "job_position"].includes(f.key) : true,
  );

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const f of fields) next[f.key] = candidate?.[f.key] != null ? String(candidate[f.key]) : "";
    setForm(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, candidate]);

  async function save() {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { id: candidate.id };
      for (const f of fields) {
        const v = (form[f.key] ?? "").trim();
        payload[f.key] = v === "" ? null : f.type === "number" ? Number(v) : v;
      }
      await updateFn({ data: payload as any });
      toast.success("Data diri kandidat diperbarui.");
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["candidate", candidate.id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      await uploadFn({
        data: {
          candidate_id: candidate.id,
          file_type: fileType as any,
          file_name: file.name,
          mime_type: file.type || "application/octet-stream",
          file_size: file.size,
          base64: btoa(binary),
        },
      });
      toast.success(`Berkas ${fileType.toUpperCase()} berhasil diunggah.`);
      await qc.invalidateQueries({ queryKey: ["candidate", candidate.id] });
      await qc.invalidateQueries({ queryKey: ["candidate-file-versions", candidate.id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Pencil className="mr-2 h-4 w-4" /> Perbaiki Data Diri
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perbaiki Data Diri Kandidat</DialogTitle>
            <DialogDescription>
              Perubahan tercatat pada audit log Super Admin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
                <Input
                  id={`f-${f.key}`}
                  type={f.type ?? "text"}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button disabled={busy} onClick={save}>
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <select
        className="h-9 rounded-md border bg-background px-2 text-sm"
        value={fileType}
        onChange={(e) => setFileType(e.target.value)}
        aria-label="Jenis berkas"
      >
        {FILE_TYPES.map((t) => (
          <option key={t} value={t}>
            {t.toUpperCase()}
          </option>
        ))}
      </select>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
        }}
      />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
        <Upload className="mr-2 h-4 w-4" /> Upload Berkas
      </Button>
    </div>
  );
}
