import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { candidateGetProfile, candidateSaveProfile } from "@/lib/candidate.functions";
import { useCandidateSession } from "@/lib/candidate-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/candidate/portal/data")({ component: DataForm });

function DataForm() {
  const session = useCandidateSession();
  const qc = useQueryClient();
  const getProfile = useServerFn(candidateGetProfile);
  const save = useServerFn(candidateSaveProfile);
  const { data } = useQuery({
    queryKey: ["candidate-profile", session?.code],
    queryFn: () => getProfile({ data: { code: session!.code } }),
    enabled: !!session,
  });
  const c = data?.candidate;
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (c) setForm({
      full_name: c.full_name ?? "",
      gender: c.gender ?? "",
      school_name: c.school_name ?? "",
      education: c.education ?? "",
      major: c.major ?? "",
      work_experience: c.work_experience ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      position_applied: c.position_applied ?? "",
    });
  }, [c]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await save({ data: { code: session!.code, ...form } });
      toast.success("Data tersimpan");
      qc.invalidateQueries({ queryKey: ["candidate-profile"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display">Data Diri Kandidat</CardTitle>
        <p className="text-sm text-muted-foreground">Data yang Anda isi otomatis tersimpan ke bank data HR.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="Nama Lengkap" required><Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></Field>
          <Field label="Nama Sekolah / Universitas"><Input value={form.school_name ?? ""} onChange={(e) => setForm({ ...form, school_name: e.target.value })} placeholder="Institut Teknologi Bandung" /></Field>
          <Field label="Pendidikan">
            <Select value={form.education ?? ""} onValueChange={(v) => setForm({ ...form, education: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih jenjang" /></SelectTrigger>
              <SelectContent>
                {["SMA/SMK", "D1", "D2", "D3", "D4", "S1", "S2", "S3"].map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Jurusan"><Input value={form.major ?? ""} onChange={(e) => setForm({ ...form, major: e.target.value })} placeholder="Teknik Kimia" /></Field>
          <Field label="Pernah Bekerja Berapa Lama"><Input value={form.work_experience ?? ""} onChange={(e) => setForm({ ...form, work_experience: e.target.value })} placeholder="2 tahun 6 bulan / Belum pernah" /></Field>
          <Field label="Telp / HP"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0812xxxxxxx" /></Field>
          <Field label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Posisi Dilamar"><Input value={form.position_applied ?? ""} onChange={(e) => setForm({ ...form, position_applied: e.target.value })} /></Field>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Data"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, required, children, className = "" }: any) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}
