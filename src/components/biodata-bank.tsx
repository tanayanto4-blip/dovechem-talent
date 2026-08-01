import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCandidates } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, IdCard } from "lucide-react";
import { toast } from "sonner";

const FIELDS: { key: string; label: string }[] = [
  { key: "full_name", label: "Nama Lengkap" },
  { key: "school_name", label: "Nama Sekolah/Universitas" },
  { key: "education", label: "Pendidikan" },
  { key: "major", label: "Jurusan" },
  { key: "work_experience", label: "Pernah Bekerja" },
  { key: "phone", label: "Telp/HP" },
  { key: "email", label: "Email" },
  { key: "position_applied", label: "Posisi" },
];

function safeName(s: string) {
  return (s || "kandidat").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "_") || "kandidat";
}

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCsv(rows: string[][], filename: string) {
  const csv = "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BiodataBank() {
  const listFn = useServerFn(listCandidates);
  const { data, isLoading } = useQuery({
    queryKey: ["biodata-bank-candidates"],
    queryFn: () => listFn({ data: {} as never }),
  });
  const [q, setQ] = useState("");

  const candidates = ((data?.candidates ?? []) as any[]).filter((c) => c.full_name || c.data_completed);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return candidates;
    return candidates.filter((c) =>
      [c.full_name, c.school_name, c.major, c.education, c.position_applied, c.email, c.phone, c.candidate_codes?.code, c.code_snapshot]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(s)),
    );
  }, [candidates, q]);

  function rowFor(c: any) {
    return [c.candidate_codes?.code ?? c.code_snapshot ?? "", ...FIELDS.map((f) => c[f.key] ?? "")];
  }

  function downloadOne(c: any) {
    const rows = [["Kode", ...FIELDS.map((f) => f.label)], rowFor(c)];
    downloadCsv(rows, `biodata_${safeName(c.full_name ?? "")}.csv`);
    toast.success(`Biodata ${c.full_name ?? "kandidat"} diunduh`);
  }

  function downloadAll() {
    if (!filtered.length) return;
    const rows = [["Kode", ...FIELDS.map((f) => f.label)], ...filtered.map(rowFor)];
    downloadCsv(rows, `biodata_kandidat_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`${filtered.length} biodata diunduh`);
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <IdCard className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Biodata Kandidat</CardTitle>
          <Badge variant="secondary">{filtered.length}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama, sekolah, posisi..." value={q} onChange={(e) => setQ(e.target.value)} className="w-64 pl-8" />
          </div>
          <Button size="sm" onClick={downloadAll} disabled={!filtered.length} className="gap-2">
            <Download className="h-4 w-4" /> Unduh semua
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Memuat biodata...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Belum ada biodata kandidat.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No.</TableHead>
                  {FIELDS.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
                  <TableHead className="w-28 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c, i) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    {FIELDS.map((f) => (
                      <TableCell key={f.key} className={f.key === "full_name" ? "font-medium" : "text-sm"}>
                        {c[f.key] || "-"}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadOne(c)}>
                        <Download className="h-3.5 w-3.5" /> CSV
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
  );
}
