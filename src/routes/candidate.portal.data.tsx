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
import { Textarea } from "@/components/ui/textarea";
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
      nik: c.nik ?? "",
      birth_place: c.birth_place ?? "",
      birth_date: c.birth_date ?? "",
      gender: c.gender ?? "",
      address: c.address ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      position_applied: c.position_applied ?? "",
      education: c.education ?? "",
      marital_status: c.marital_status ?? "",
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
        <p className="text-sm text-muted-foreground">Pastikan data sesuai dokumen resmi (KTP).</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="Nama Lengkap" required><Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></Field>
          <Field label="NIK (KTP)" required><Input value={form.nik ?? ""} onChange={(e) => setForm({ ...form, nik: e.target.value })} required maxLength={20} /></Field>
          <Field label="Tempat Lahir"><Input value={form.birth_place ?? ""} onChange={(e) => setForm({ ...form, birth_place: e.target.value })} /></Field>
          <Field label="Tanggal Lahir"><Input type="date" value={form.birth_date ?? ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></Field>
          <Field label="Jenis Kelamin">
            <Select value={form.gender ?? ""} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent><SelectItem value="Laki-laki">Laki-laki</SelectItem><SelectItem value="Perempuan">Perempuan</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Status Perkawinan">
            <Select value={form.marital_status ?? ""} onValueChange={(v) => setForm({ ...form, marital_status: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Belum Menikah">Belum Menikah</SelectItem>
                <SelectItem value="Menikah">Menikah</SelectItem>
                <SelectItem value="Cerai">Cerai</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="No. Handphone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Pendidikan Terakhir"><Input value={form.education ?? ""} onChange={(e) => setForm({ ...form, education: e.target.value })} placeholder="S1 Teknik Kimia — ITB" /></Field>
          <Field label="Posisi Dilamar"><Input value={form.position_applied ?? ""} onChange={(e) => setForm({ ...form, position_applied: e.target.value })} /></Field>
          <Field label="Alamat" className="md:col-span-2"><Textarea rows={3} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
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
