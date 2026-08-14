import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PresenceBadge } from "@/components/presence-badge";
import { useServerFn } from "@tanstack/react-start";
import { listCandidates, deleteCandidate } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Search, X, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { TrackTabs } from "@/components/track-tabs";
import {
  candidateLevelOf,
  candidateTrackOf,
  candidateTypeShort,
  jobLevelLabel,
  type CandidateType,
} from "@/lib/candidate-type";
import { LevelTabs, type LevelFilter } from "@/components/level-tabs";
import { exportAllBiodataPdf, exportBiodataExcel } from "@/lib/biodata-export";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/candidates/")({
  head: () => ({
    meta: [
      { title: "Daftar Kandidat — Admin Dover Chemical" },
      {
        name: "description",
        content:
          "Kelola daftar kandidat rekrutmen PT Dover Chemical beserta biodata dan status pengerjaan test.",
      },
      { property: "og:title", content: "Daftar Kandidat — Admin Dover Chemical" },
      {
        property: "og:description",
        content:
          "Kelola daftar kandidat rekrutmen PT Dover Chemical beserta biodata dan status pengerjaan test.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CandidatesList,
});

function CandidatesList() {
  const listFn = useServerFn(listCandidates);
  const deleteFn = useServerFn(deleteCandidate);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => listFn({ data: { limit: 1000 } }),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [track, setTrack] = useState<CandidateType>("magang");
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");

  const all = (data?.candidates ?? []) as any[];
  const counts = useMemo(
    () => ({
      magang: all.filter((c) => candidateTrackOf(c) === "magang").length,
      karyawan: all.filter((c) => candidateTrackOf(c) === "karyawan").length,
    }),
    [all],
  );
  const levelCounts = useMemo(() => {
    const kar = all.filter((c) => candidateTrackOf(c) === "karyawan");
    return {
      all: kar.length,
      staff: kar.filter((c) => candidateLevelOf(c) === "staff").length,
      spv_up: kar.filter((c) => candidateLevelOf(c) === "spv_up").length,
    };
  }, [all]);
  const positionOptions = useMemo(() => {
    const set = new Set(
      all
        .filter((c) => candidateTrackOf(c) === "karyawan" && c.job_position)
        .map((c) => c.job_position),
    );
    return Array.from(set).sort();
  }, [all]);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all
      .filter((c) => candidateTrackOf(c) === track)
      .filter((c) => track !== "karyawan" || level === "all" || candidateLevelOf(c) === level)
      .filter(
        (c) =>
          track !== "karyawan" || positionFilter === "all" || c.job_position === positionFilter,
      )
      .filter((c) =>
        !s
          ? true
          : `${c.full_name ?? ""} ${c.email ?? ""} ${c.candidate_codes?.code ?? c.code_snapshot ?? ""} ${c.position_applied ?? ""} ${c.school_name ?? ""} ${c.job_position ?? ""}`
              .toLowerCase()
              .includes(s),
      );
  }, [all, track, search, level, positionFilter]);

  const exportList = useMemo(() => {
    if (track !== "karyawan") return rows;
    if (level === "all") return rows;
    return rows.filter((c) => candidateLevelOf(c) === level);
  }, [rows, track, level]);

  const isMagang = track === "magang";
  const colCount = isMagang ? 9 : 10;

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteFn({ data: { id: toDelete.id } });
      await qc.invalidateQueries({ queryKey: ["candidates"] });
      await qc.invalidateQueries({ queryKey: ["admin-all-attempts"] });
      toast.success(`Kandidat ${toDelete.full_name ?? ""} dihapus`);
      setToDelete(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menghapus kandidat");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">Kandidat</h1>
        <p className="text-muted-foreground">
          Data kandidat dipisah per jalur. Pilih jalur untuk melihat daftarnya.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <TrackTabs value={track} onChange={setTrack} counts={counts} />
          {track === "karyawan" && (
            <LevelTabs value={level} onChange={setLevel} counts={levelCounts} />
          )}
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-col gap-4 space-y-0 md:flex-row md:items-center md:justify-between">
          <CardTitle>Kandidat {candidateTypeShort(track)}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {track === "karyawan" && (
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Filter jabatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jabatan</SelectItem>
                  {positionOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, email, kode, jabatan…"
                className="w-56 pl-8"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              disabled={!search && positionFilter === "all"}
              onClick={() => {
                setSearch("");
                setPositionFilter("all");
              }}
              aria-label="Reset filter"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={exportList.length === 0}
              onClick={() => exportAllBiodataPdf(exportList)}
              title="Ekspor PDF"
            >
              <FileText className="mr-1.5 h-4 w-4" /> PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={exportList.length === 0}
              onClick={() =>
                void exportBiodataExcel(
                  exportList,
                  `biodata_${track}${level !== "all" ? `_${level}` : ""}_${new Date().toISOString().slice(0, 10)}.xlsx`,
                  `Biodata ${candidateTypeShort(track)}${level !== "all" ? ` — ${jobLevelLabel(level)}` : ""}`,
                )
              }
              title="Ekspor Excel"
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-muted-foreground">
            Menampilkan {rows.length} dari {counts[track]} kandidat{" "}
            {candidateTypeShort(track).toLowerCase()}
            {track === "karyawan" && level !== "all" ? ` (tingkat ${jobLevelLabel(level)})` : ""}
            {track === "karyawan" && positionFilter !== "all" ? ` — jabatan ${positionFilter}` : ""}
            .
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Kehadiran</TableHead>
                  <TableHead>No. HP</TableHead>
                  <TableHead>Pendidikan</TableHead>
                  <TableHead>{isMagang ? "Sekolah / Kampus" : "Posisi"}</TableHead>
                  <TableHead>{isMagang ? "Semester" : "Lama Bekerja"}</TableHead>
                  {!isMagang && <TableHead>Jabatan</TableHead>}
                  <TableHead>Biodata</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c: any) => {
                  const finished = (c.test_attempts ?? []).filter(
                    (a: any) => a.status === "finished",
                  ).length;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.full_name ?? "-"}</div>
                        <div className="text-xs text-muted-foreground">{c.email ?? ""}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {c.candidate_codes?.code ?? c.code_snapshot ?? "-"}
                      </TableCell>
                      <TableCell>
                        <PresenceBadge lastSeenAt={c.candidate_codes?.last_seen_at} />
                      </TableCell>
                      <TableCell className="text-sm">{c.phone ?? "-"}</TableCell>
                      <TableCell className="text-sm">{c.education ?? "-"}</TableCell>
                      <TableCell className="text-sm">
                        {(isMagang ? c.school_name : c.position_applied) ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {(isMagang ? c.semester : c.work_experience) ?? "-"}
                      </TableCell>
                      {!isMagang && (
                        <TableCell className="text-sm">
                          {c.job_position ? (
                            <div>
                              <div>{c.job_position}</div>
                              <Badge variant="secondary" className="mt-0.5 text-[10px]">
                                {jobLevelLabel(candidateLevelOf(c))}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        {c.data_completed ? (
                          <Badge className="bg-success">Lengkap</Badge>
                        ) : (
                          <Badge variant="secondary">Belum</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {finished} selesai
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link to="/admin/candidates/$id" params={{ id: c.id }}>
                              Detail
                            </Link>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Hapus kandidat ${c.full_name ?? ""}`}
                            title="Hapus kandidat ini"
                            onClick={() => setToDelete(c)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={colCount + 1}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Belum ada kandidat {candidateTypeShort(track).toLowerCase()}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kandidat?</AlertDialogTitle>
            <AlertDialogDescription>
              Data kandidat {toDelete?.full_name ?? "ini"} beserta biodata, berkas, dan seluruh
              hasil test akan dihapus permanen. Kode akses tetap tersimpan dan dapat digunakan
              kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Menghapus..." : "Hapus kandidat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
