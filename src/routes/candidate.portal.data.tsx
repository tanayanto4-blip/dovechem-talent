import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  candidateAutosaveProfile,
  candidateGetProfile,
  candidateSaveProfile,
  candidateUploadFile,
} from "@/lib/candidate.functions";

import { useCandidateSession } from "@/lib/candidate-session";
import {
  candidateTypeLabel,
  JOB_POSITIONS,
  jobLevelLabel,
  jobLevelOfPosition,
} from "@/lib/candidate-type";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PhotoCapture, type CapturedPhoto } from "@/components/photo-capture";

export const Route = createFileRoute("/candidate/portal/data")({
  head: () => ({
    meta: [
      { title: "Data Diri Kandidat — Dover Chemical" },
      {
        name: "description",
        content:
          "Lengkapi biodata kandidat PT Dover Chemical sebelum mengerjakan rangkaian psikotest online.",
      },
      { property: "og:title", content: "Data Diri Kandidat — Dover Chemical" },
      {
        property: "og:description",
        content:
          "Lengkapi biodata kandidat PT Dover Chemical sebelum mengerjakan rangkaian psikotest online.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DataForm,
});

const baseFields: [string, string][] = [
  ["full_name", "Nama lengkap"],
  ["gender", "Jenis kelamin"],
  ["age", "Usia"],
  ["school_name", "Nama sekolah / universitas"],
  ["education", "Pendidikan"],
  ["major", "Jurusan"],
  ["phone", "Telp / HP"],
  ["email", "Email"],
  ["position_applied", "Posisi dilamar"],
];

/** Magang cukup biodata dasar; karyawan mengisi pengalaman kerja & jabatan. */
function fieldsFor(type: string): [string, string][] {
  return type === "magang"
    ? baseFields
    : [...baseFields, ["work_experience", "Pengalaman kerja"], ["job_position", "Posisi jabatan"]];
}

const ageOptions = Array.from({ length: 56 }, (_, i) => String(i + 15));
const workOptions = ["Belum bekerja", ...Array.from({ length: 21 }, (_, i) => String(i))];

type SaveStatus = "idle" | "saving" | "saved" | "error";

function DataForm() {
  const session = useCandidateSession();
  const nav = useNavigate();
  const qc = useQueryClient();
  const getProfile = useServerFn(candidateGetProfile);
  const save = useServerFn(candidateSaveProfile);
  const autosave = useServerFn(candidateAutosaveProfile);
  const uploadFile = useServerFn(candidateUploadFile);
  const { data, isLoading } = useQuery({
    queryKey: ["candidate-profile", session?.code],
    queryFn: () => getProfile({ data: { code: session!.code, device: session!.device } }),
    enabled: !!session,
  });
  const c = data?.candidate;
  const candidateType = (data as any)?.candidate_type ?? session?.type ?? "karyawan";
  const isMagang = candidateType === "magang";
  const requiredFields = fieldsFor(candidateType);
  const fotoUrl = (data as any)?.foto_url as string | null | undefined;
  const [form, setForm] = useState<Record<string, string>>({});
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [attempted, setAttempted] = useState(false);
  const [camOpen, setCamOpen] = useState(false);

  const missingFields = requiredFields.filter(([k]) => !String(form[k] ?? "").trim());
  const missingLabels = [
    ...missingFields.map(([, l]) => l),
    ...(fotoUrl ? [] : ["Foto formal"]),
  ];
  const totalItems = requiredFields.length + 1;
  const filledItems = totalItems - missingLabels.length;
  const progress = Math.round((filledItems / totalItems) * 100);
  const isMissing = (key: string) => attempted && !String(form[key] ?? "").trim();

  const initialFormRef = useRef<Record<string, string> | null>(null);
  const lastSavedRef = useRef<Record<string, string> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (c) {
      const init: Record<string, string> = {
        full_name: c.full_name ?? "",
        gender: c.gender ?? "",
        age: c.age != null ? String(c.age) : "",
        school_name: c.school_name ?? "",
        education: c.education ?? "",
        major: c.major ?? "",
        work_experience: c.work_experience ?? "",
        job_position: (c as any).job_position ?? "",
        phone: c.phone ?? "",
        email: c.email ?? "",
        position_applied: c.position_applied ?? "",
      };
      setForm(init);
      initialFormRef.current = init;
      lastSavedRef.current = init;
    }
  }, [c]);

  const doAutosave = useCallback(
    async (currentForm: Record<string, string>) => {
      if (!session) return;
      if (
        lastSavedRef.current &&
        JSON.stringify(lastSavedRef.current) === JSON.stringify(currentForm)
      )
        return;

      const payload: Record<string, string> = { code: session.code, device: session.device ?? "" };
      let hasValue = false;
      for (const [key] of requiredFields) {
        const value = currentForm[key];
        if (value != null && String(value).trim() !== "") {
          payload[key] = value;
          hasValue = true;
        }
      }
      if (!hasValue) {
        setSaveStatus("idle");
        return;
      }

      setSaveStatus("saving");
      try {
        await autosave({ data: payload });
        lastSavedRef.current = { ...currentForm };
        setSaveStatus("saved");
      } catch (e: any) {
        setSaveStatus("error");
      }
    },
    [session, autosave, requiredFields],
  );

  useEffect(() => {
    if (!c || !session) return;
    if (JSON.stringify(form) === JSON.stringify(initialFormRef.current)) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => doAutosave(form), 1000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [form, c, session, doAutosave]);

  async function onPickFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !session) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
      toast.error("Format foto harus JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 5MB.");
      return;
    }
    setUploadingFoto(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      await uploadFile({
        data: {
          code: session.code,
          device: session.device ?? undefined,
          file_type: "foto",
          file_name: file.name,
          mime_type: file.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
          file_size: file.size,
          base64: btoa(binary),
        },
      });
      toast.success("Foto formal berhasil diunggah");
      await qc.invalidateQueries({ queryKey: ["candidate-profile"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal mengunggah foto");
    } finally {
      setUploadingFoto(false);
    }
  }

  async function onCapturePhoto(photo: CapturedPhoto) {
    if (!session) return;
    setUploadingFoto(true);
    try {
      await uploadFile({
        data: {
          code: session.code,
          device: session.device ?? undefined,
          file_type: "foto",
          file_name: photo.fileName,
          mime_type: photo.mimeType,
          file_size: photo.size,
          base64: photo.base64,
        },
      });
      toast.success("Foto formal tersimpan otomatis");
      await qc.invalidateQueries({ queryKey: ["candidate-profile"] });
      setCamOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal menyimpan foto");
    } finally {
      setUploadingFoto(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (missingLabels.length) {
      toast.error(`Belum lengkap: ${missingLabels.join(", ")}`);
      return;
    }


    setSaving(true);
    try {
      const { work_experience, job_position, ...common } = form;
      await save({
        data: {
          code: session!.code,
          device: session!.device,
          ...common,
          ...(isMagang ? {} : { work_experience, job_position }),
        } as any,
      });
      toast.success("Data tersimpan — lanjut ke psikotest");
      await qc.invalidateQueries({ queryKey: ["candidate-profile"] });
      nav({ to: "/candidate/portal/tests" });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !session) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-10 text-center text-muted-foreground">
          Memuat data diri…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <h1 className="font-display text-2xl font-semibold leading-none tracking-tight">
          Biodata{" "}
          {candidateTypeLabel(
            candidateType,
            isMagang ? null : jobLevelOfPosition(form.job_position ?? ""),
          )}
        </h1>
        <p className="text-sm text-muted-foreground">
          Seluruh kolom wajib diisi. Data diri harus dilengkapi terlebih dahulu sebelum Anda dapat
          mengerjakan psikotest. Setiap kolom yang terisi akan otomatis tersimpan.
        </p>

        <div className="mt-4 space-y-2 rounded-lg border bg-muted/40 p-3">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Kelengkapan data diri</span>
            <span>
              {filledItems}/{totalItems} ({progress}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {missingLabels.length ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-xs text-muted-foreground">Belum diisi:</span>
              {missingLabels.map((l) => (
                <span
                  key={l}
                  className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
                >
                  {l}
                </span>
              ))}
            </div>
          ) : (
            <p className="pt-1 text-xs text-green-600">
              Semua data diri sudah lengkap — silakan simpan untuk lanjut ke psikotest.
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-5 md:grid-cols-2 md:gap-4">
          <Field label="Nama Lengkap" required invalid={isMissing("full_name")}>
            <Input
              value={form.full_name ?? ""}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </Field>
          <Field label="Jenis Kelamin" required invalid={isMissing("gender")}>
            <Select
              value={form.gender ?? ""}
              onValueChange={(v) => setForm({ ...form, gender: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis kelamin" />
              </SelectTrigger>
              <SelectContent>
                {["Laki-laki", "Perempuan"].map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nama Sekolah / Universitas" required invalid={isMissing("school_name")}>
            <Input
              value={form.school_name ?? ""}
              onChange={(e) => setForm({ ...form, school_name: e.target.value })}
              placeholder="Institut Teknologi Bandung"
              required
            />
          </Field>
          <Field label="Pendidikan" required invalid={isMissing("education")}>
            <Select
              value={form.education ?? ""}
              onValueChange={(v) => setForm({ ...form, education: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenjang" />
              </SelectTrigger>
              <SelectContent>
                {["SMA/SMK", "D1", "D2", "D3", "D4", "S1", "S2", "S3"].map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Jurusan" required invalid={isMissing("major")}>
            <Input
              value={form.major ?? ""}
              onChange={(e) => setForm({ ...form, major: e.target.value })}
              placeholder="Teknik Kimia"
              required
            />
          </Field>
          <Field label="Usia" required invalid={isMissing("age")}>
            <Select value={form.age ?? ""} onValueChange={(v) => setForm({ ...form, age: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih usia" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {ageOptions.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v} tahun
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {!isMagang && (
            <Field label="Pernah Bekerja Berapa Lama" required invalid={isMissing("work_experience")}>
              <Select
                value={form.work_experience ?? ""}
                onValueChange={(v) => setForm({ ...form, work_experience: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih lama bekerja" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {workOptions.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {!isMagang && (
            <Field label="Posisi Jabatan" required invalid={isMissing("job_position")}>
              <Select
                value={form.job_position ?? ""}
                onValueChange={(v) => setForm({ ...form, job_position: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih posisi jabatan" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {JOB_POSITIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.value} — {jobLevelLabel(p.level)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Telp / HP" required invalid={isMissing("phone")}>
            <Input
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0812xxxxxxx"
              required
            />
          </Field>
          <Field label="Email" required invalid={isMissing("email")}>
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
          <Field label="Posisi Dilamar" required invalid={isMissing("position_applied")}>
            <Input
              value={form.position_applied ?? ""}
              onChange={(e) => setForm({ ...form, position_applied: e.target.value })}
              required
            />
          </Field>
          <Field label="Foto Formal" required invalid={attempted && !fotoUrl} className="md:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                {fotoUrl ? (
                  <img
                    src={fotoUrl}
                    alt="Foto formal kandidat"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="px-2 text-center text-xs text-muted-foreground">
                    Belum ada foto
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <input
                  id="foto-formal"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onPickFoto}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="lg"
                    disabled={uploadingFoto}
                    onClick={() => setCamOpen(true)}
                  >
                    {fotoUrl ? "Foto Ulang dengan Kamera" : "Ambil Foto dengan Kamera"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={uploadingFoto}
                    onClick={() => document.getElementById("foto-formal")?.click()}
                  >
                    {uploadingFoto ? "Mengunggah…" : "Unggah dari File"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Selfie langsung dari kamera laptop, bisa pilih warna latar (merah/biru/putih/abu).
                  Foto otomatis tersimpan setelah diambil. JPG/PNG/WEBP, maks 5MB.
                </p>
              </div>
            </div>
          </Field>

          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan Data"}
            </Button>
            {saveStatus === "saving" && (
              <span className="text-sm text-muted-foreground">Menyimpan otomatis…</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-sm text-green-600">Tersimpan otomatis</span>
            )}
            {saveStatus === "error" && (
              <span className="text-sm text-destructive">Gagal menyimpan otomatis</span>
            )}
          </div>
        </form>
      </CardContent>
      <PhotoCapture
        open={camOpen}
        onOpenChange={setCamOpen}
        onCapture={onCapturePhoto}
        busy={uploadingFoto}
      />
    </Card>
  );
}

function Field({ label, required, children, invalid = false, className = "" }: any) {
  return (
    <div
      className={`space-y-2 ${className} ${
        invalid ? "rounded-lg border border-destructive/50 bg-destructive/5 p-3 -m-1" : ""
      }`}
    >
      <Label className={invalid ? "text-destructive" : ""}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {invalid && <p className="text-xs text-destructive">Bagian ini belum diisi.</p>}
    </div>
  );
}
