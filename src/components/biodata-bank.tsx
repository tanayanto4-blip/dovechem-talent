import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCandidates } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Search, IdCard, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  BIODATA_FIELDS as FIELDS,
  exportAllBiodataPdf,
  exportBiodataExcel,
  exportCandidateBiodataPdf,
  safeName,
} from "@/lib/biodata-export";

function fmtWhen(v: unknown) {
  if (!v) return "-";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
  const [selected, setSelected] = useState<Record<string, boolean>>({});

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

  const selectedRows = useMemo(() => filtered.filter((c) => selected[c.id]), [filtered, selected]);
  const allChecked = filtered.length > 0 && selectedRows.length === filtered.length;
  const someChecked = selectedRows.length > 0 && !allChecked;

  function toggleAll(v: boolean) {
    const next: Record<string, boolean> = { ...selected };
    for (const c of filtered) next[c.id] = v;
    setSelected(next);
  }

  // Rows used for bulk export: selection wins, otherwise everything visible.
  const exportRows = selectedRows.length ? selectedRows : filtered;


  function rowFor(c: any) {
    return [c.candidate_codes?.code ?? c.code_snapshot ?? "", ...FIELDS.map((f) => c[f.key] ?? "")];
  }

  function downloadOneCsv(c: any) {
    downloadCsv([["Kode", ...FIELDS.map((f) => f.label)], rowFor(c)], `biodata_${safeName(c.full_name ?? "")}.csv`);
    toast.success(`CSV biodata ${c.full_name ?? "kandidat"} diunduh`);
  }

  function downloadAllCsv() {
    if (!exportRows.length) return;
    downloadCsv(
      [["Kode", ...FIELDS.map((f) => f.label)], ...exportRows.map(rowFor)],
      `rekap_biodata_kandidat_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast.success(`${exportRows.length} biodata diunduh (CSV)`);
  }


  async function run(fn: () => void | Promise<void>, msg: string) {
    try {
      await fn();
      toast.success(msg);
    } catch (e) {
      console.error(e);
      toast.error("Gagal membuat file unduhan");
    }
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <IdCard className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Rekap Biodata Kandidat</CardTitle>
          <Badge variant="secondary">{filtered.length}</Badge>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Sinkron otomatis
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama, sekolah, posisi..." value={q} onChange={(e) => setQ(e.target.value)} className="w-64 pl-8" />
          </div>
          {selectedRows.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setSelected({})}>
              Bersihkan pilihan ({selectedRows.length})
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={!exportRows.length} className="gap-2">
                <Download className="h-4 w-4" />
                {selectedRows.length ? `Unduh ${selectedRows.length} terpilih` : "Unduh semua kandidat"}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {selectedRows.length ? `${selectedRows.length} kandidat terpilih` : `Rekap ${filtered.length} kandidat`}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  run(
                    () =>
                      exportBiodataExcel(exportRows, `rekap_biodata_kandidat_${new Date().toISOString().slice(0, 10)}.xlsx`),
                    `${exportRows.length} biodata diunduh (Excel)`,
                  )
                }
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => run(() => exportAllBiodataPdf(exportRows), `${exportRows.length} biodata diunduh (PDF)`)}
              >
                <FileText className="mr-2 h-4 w-4" /> PDF rekap
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadAllCsv}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allChecked ? true : someChecked ? "indeterminate" : false}
                      onCheckedChange={(v) => toggleAll(v === true)}
                      aria-label="Pilih semua kandidat"
                    />
                  </TableHead>
                  <TableHead className="w-12">No.</TableHead>
                  <TableHead>Kode</TableHead>
                  {FIELDS.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
                  <TableHead className="w-40">Terakhir diperbarui</TableHead>
                  <TableHead className="w-32 text-right">Unduh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c, i) => (
                  <TableRow key={c.id} data-state={selected[c.id] ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={!!selected[c.id]}
                        onCheckedChange={(v) => setSelected((s) => ({ ...s, [c.id]: v === true }))}
                        aria-label={`Pilih ${c.full_name ?? "kandidat"}`}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{c.candidate_codes?.code ?? c.code_snapshot ?? "-"}</TableCell>

                    {FIELDS.map((f) => (
                      <TableCell key={f.key} className={f.key === "full_name" ? "font-medium" : "text-sm"}>
                        {c[f.key] || "-"}
                      </TableCell>
                    ))}
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {fmtWhen(c.updated_at ?? c.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Download className="h-3.5 w-3.5" /> Unduh <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="max-w-48 truncate">{c.full_name ?? "Kandidat"}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              run(
                                () => exportBiodataExcel([c], `biodata_${safeName(c.full_name ?? "")}.xlsx`),
                                "Excel biodata diunduh",
                              )
                            }
                          >
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => run(() => exportCandidateBiodataPdf(c), "PDF biodata diunduh")}>
                            <FileText className="mr-2 h-4 w-4" /> PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadOneCsv(c)}>
                            <Download className="mr-2 h-4 w-4" /> CSV
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
