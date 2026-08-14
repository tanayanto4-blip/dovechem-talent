import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  candidateAutosaveProfile,
  candidateGetProfile,
  candidateSaveProfile,
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

/** Magang mengisi semester berjalan; karyawan mengisi lama pengalaman kerja. */
function fieldsFor(type: string): [string, string][] {
  return type === "magang"
    ? [...baseFields, ["semester", "Semester saat ini"]]
    : [...baseFields, ["work_experience", "Pengalaman kerja"], ["job_position", "Posisi jabatan"]];
}

const semesterOptions = Array.from({ length: 14 }, (_, i) => String(i + 1));

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
  const { data, isLoading } = useQuery({
    queryKey: ["candidate-profile", session?.code],
    queryFn: () => getProfile({ data: { code: session!.code, device: session!.device } }),
    enabled: !!session,
  });
  const c = data?.candidate;
  const candidateType = (data as any)?.candidate_type ?? session?.type ?? "karyawan";
  const isMagang = candidateType === "magang";
  const requiredFields = fieldsFor(candidateType);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
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
        semester: (c as any).semester ?? "",
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const missing = requiredFields.filter(([k]) => !String(form[k] ?? "").trim()).map(([, l]) => l);
    if (missing.length) {
      toast.error(`Wajib diisi: ${missing.join(", ")}`);
      return;
    }
    setSaving(true);
    try {
      const { work_experience, semester, job_position, ...common } = form;
      await save({
        data: {
          code: session!.code,
          device: session!.device,
          ...common,
          ...(isMagang ? { semester } : { work_experience, job_position }),
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
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-5 md:grid-cols-2 md:gap-4">
          <Field label="Nama Lengkap" required>
            <Input
              value={form.full_name ?? ""}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </Field>
          <Field label="Jenis Kelamin" required>
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
          <Field label="Nama Sekolah / Universitas" required>
            <Input
              value={form.school_name ?? ""}
              onChange={(e) => setForm({ ...form, school_name: e.target.value })}
              placeholder="Institut Teknologi Bandung"
              required
            />
          </Field>
          <Field label="Pendidikan" required>
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
          <Field label="Jurusan" required>
            <Input
              value={form.major ?? ""}
              onChange={(e) => setForm({ ...form, major: e.target.value })}
              placeholder="Teknik Kimia"
              required
            />
          </Field>
          <Field label="Usia" required>
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
          {isMagang ? (
            <Field label="Semester Saat Ini" required>
              <Select
                value={form.semester ?? ""}
                onValueChange={(v) => setForm({ ...form, semester: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih semester" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {semesterOptions.map((v) => (
                    <SelectItem key={v} value={v}>
                      Semester {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <Field label="Pernah Bekerja Berapa Lama" required>
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
            <Field label="Posisi Jabatan" required>
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

          <Field label="Telp / HP" required>
            <Input
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0812xxxxxxx"
              required
            />
          </Field>
          <Field label="Email" required>
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
          <Field label="Posisi Dilamar" required>
            <Input
              value={form.position_applied ?? ""}
              onChange={(e) => setForm({ ...form, position_applied: e.target.value })}
              required
            />
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
    </Card>
  );
}

function Field({ label, required, children, className = "" }: any) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}
