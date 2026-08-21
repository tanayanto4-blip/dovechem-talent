import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllAttempts, getAttemptDetail, deleteCandidateResults } from "@/lib/admin.functions";
import { exportMbtiExcel } from "@/lib/mbti-excel";
import { exportProfilingExcel } from "@/lib/profiling-excel";
import { exportEqExcel } from "@/lib/eq-excel";
import { exportWptExcel } from "@/lib/wpt-excel";
import { exportPapiExcel } from "@/lib/papi-excel";
import { exportMsdtExcel } from "@/lib/msdt-excel";
import { exportDiscExcel } from "@/lib/disc-excel";
import { exportResultSheetPdf } from "@/lib/result-sheet-pdf";
import { exportResumeExcel } from "@/lib/resume-excel";

import { buildCandidateMeta } from "@/lib/candidate-meta";

import { toast } from "sonner";
import { TrackTabs } from "@/components/track-tabs";
import { candidateTrackOf, type CandidateType } from "@/lib/candidate-type";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileDown,
  Eye,
  BarChart3,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Users,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
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

export const Route = createFileRoute("/admin/results")({
  component: ResultsBank,
  head: () => ({
    meta: [
      { title: "Bank Data Hasil Psikotest | Dover Chemical HR" },
      {
        name: "description",
        content: "Rekap seluruh hasil psikotest kandidat PT Dover Chemical untuk admin dan HR.",
      },
      { property: "og:title", content: "Bank Data Hasil Psikotest | Dover Chemical HR" },
      {
        property: "og:description",
        content: "Rekap seluruh hasil psikotest kandidat PT Dover Chemical untuk admin dan HR.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleString("id-ID") : "-";
}

function summarize(r: any) {
  const res = r.result ?? {};
  const t = r.tests?.test_type;
  if (t === "mbti" && res.type) return `Tipe ${res.type}`;
  if (t === "disc" && res.dominant) return `Dominan ${res.dominant}`;
  if (t === "eq" && res.dominant) return `Terkuat ${res.dominant}`;
  if (t === "ishihara" && typeof res.correct === "number")
    return `Benar ${res.correct} / Salah ${res.wrong ?? 0}`;
  if (t === "rmib" && Array.isArray(res.order) && res.order.length)
    return `Minat utama: ${res.order
      .slice(0, 3)
      .map((o: any) => String(o.label).split(" — ")[0])
      .join(", ")}`;
  if (res.requires_manual_review) return "Perlu penilaian manual";
  return "-";
}

type Group = {
  key: string;
  name: string;
  code: string;
  position: string;
  attempts: any[];
  finished: number;
  first?: string | null;
  last?: string | null;
};

function ResultsBank() {
  const fn = useServerFn(listAllAttempts);
  const detailFn = useServerFn(getAttemptDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-all-attempts"],
    queryFn: () => fn({ data: { limit: 1000 } }),
  });
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [track, setTrack] = useState<CandidateType>("magang");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const qc = useQueryClient();
  const deleteResultsFn = useServerFn(deleteCandidateResults);
  const [toDelete, setToDelete] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDeleteGroup() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res: any = await deleteResultsFn({ data: { candidate_id: toDelete.key } });
      await qc.invalidateQueries({ queryKey: ["admin-all-attempts"] });
      await qc.invalidateQueries({ queryKey: ["admin-dashboard-attempts"] });
      toast.success(`${res?.deleted ?? 0} hasil test ${toDelete.name} dihapus`);
      setToDelete(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menghapus hasil kandidat");
    } finally {
      setDeleting(false);
    }
  }

  async function answerRows(id: string) {
    const d: any = await detailFn({ data: { id } });
    const map = new Map<string, any>(
      (d.attempt?.test_answers ?? []).map((x: any) => [x.question_id, x]),
    );
    return {
      d,
      rows: (d.questions ?? []).map((q: any) => ({
        question_number: q.question_number,
        answer: map.get(q.id)?.answer,
      })),
      map,
    };
  }

  /** Unduh dokumen hasil (Excel) untuk satu attempt. Return true kalau tipe test didukung. */
  async function exportAttemptDoc(r: any, g: Group) {
    const meta = {
      candidateName: g.name,
      candidateCode: g.code,
      position: g.position,
      finishedAt: r.finished_at,
    };
    const t = r.tests?.test_type;
    if (t === "mbti") {
      const { rows } = await answerRows(r.id);
      await exportMbtiExcel(rows, meta);
      return true;
    }
    if (t === "eq") {
      const { rows } = await answerRows(r.id);
      await exportEqExcel(rows, meta);
      return true;
    }
    if (t === "wpt") {
      const { rows } = await answerRows(r.id);
      await exportWptExcel(rows, meta);
      return true;
    }
    if (t === "disc") {
      const { rows, d } = await answerRows(r.id);
      await exportDiscExcel(rows, {
        ...buildCandidateMeta(d.attempt?.candidates ?? {}, { finishedAt: r.finished_at }),
        candidateName: meta.candidateName ?? undefined,
        candidateCode: meta.candidateCode ?? undefined,
      });
      return true;
    }
    if (t === "papi") {
      const { d, map } = await answerRows(r.id);
      const picks: Record<number, string> = {};
      for (const q of d.questions ?? []) {
        const ans = String(map.get(q.id)?.answer ?? "")
          .trim()
          .toUpperCase();
        if (ans === "A" || ans === "B") picks[q.question_number] = ans;
      }
      await exportPapiExcel(picks, meta);
      return true;
    }
    if (t === "msdt") {
      const { d, map } = await answerRows(r.id);
      const picks: Record<number, string> = {};
      for (const q of d.questions ?? []) {
        const ans = String(map.get(q.id)?.answer ?? "")
          .trim()
          .toUpperCase();
        if (ans === "A" || ans === "B") picks[q.question_number] = ans;
      }
      await exportMsdtExcel(picks, meta);
      return true;
    }
    // Test tanpa file skoring Excel -> lembar hasil PDF berkop logo Dover.
    await exportGenericSheet(r);
    return true;
  }

  /** Lembar hasil PDF generik (berlogo + tabel) untuk test tanpa file skoring. */
  async function exportGenericSheet(r: any) {
    const { d, map } = await answerRows(r.id);
    const cand = d.attempt?.candidates ?? {};
    const rows = (d.questions ?? []).map((q: any) => ({
      question_number: q.question_number,
      answer: map.get(q.id)?.answer,
      correct_answer: q.correct_answer,
    }));
    const res = d.attempt?.result ?? {};
    const summary: Array<[string, string]> = [];
    if (typeof res.correct === "number") summary.push(["Jawaban benar", String(res.correct)]);
    if (typeof res.wrong === "number") summary.push(["Jawaban salah", String(res.wrong)]);
    if (d.attempt?.score !== null && d.attempt?.score !== undefined)
      summary.push(["Skor", String(d.attempt.score)]);
    return exportResultSheetPdf({
      testName: d.attempt?.tests?.name ?? "Psikotest",
      testType: d.attempt?.tests?.test_type,
      rows,
      summary,
      meta: {
        ...buildCandidateMeta(cand, { finishedAt: d.attempt?.finished_at }),
        candidateCode: cand.candidate_codes?.code ?? cand.code_snapshot ?? null,
        startedAt: d.attempt?.started_at ?? null,
      },
    });
  }

  const [resumeKey, setResumeKey] = useState<string | null>(null);

  /** Recruitment Resume (Excel) — biodata + hasil buta warna, IQ (WPT), dan Pauli. */
  async function downloadResume(g: Group) {
    setResumeKey(g.key);
    try {
      const byType = (t: string) => g.attempts.find((a) => a.tests?.test_type === t);
      const ishA = byType("ishihara");
      const wptA = byType("wpt");
      const pauliA = byType("pauli");
      const base = wptA ?? ishA ?? pauliA ?? g.attempts[0];
      if (!base) throw new Error("Belum ada hasil test untuk kandidat ini");

      const baseDetail = await answerRows(base.id);
      const cand = baseDetail.d.attempt?.candidates ?? {};
      const wptAnswers = wptA
        ? wptA.id === base.id
          ? baseDetail.rows
          : (await answerRows(wptA.id)).rows
        : null;

      const testDate =
        [ishA, wptA, pauliA, base].find((a) => a?.finished_at)?.finished_at ??
        base.started_at ??
        null;

      await exportResumeExcel({
        candidate: {
          full_name: cand.full_name ?? g.name,
          position_applied: cand.position_applied ?? g.position,
          education: cand.education,
          major: cand.major,
          school_name: cand.school_name,
          age: cand.age,
          birth_date: cand.birth_date,
          work_experience: cand.work_experience,
        },
        testDate,
        ishihara: ishA?.result ?? null,
        wptAnswers,
        pauli: pauliA?.result ?? null,
      });
      toast.success(`Recruitment Resume ${g.name} diunduh`);
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal membuat Recruitment Resume");
    } finally {
      setResumeKey(null);
    }
  }

  const [profilingKey, setProfilingKey] = useState<string | null>(null);

  /** Profiling (Excel) — persentase MBTI + IQ/kategori WPT + status qualified. */
  async function downloadProfiling(g: Group) {
    setProfilingKey(g.key);
    try {
      const byType = (t: string) => g.attempts.find((a) => a.tests?.test_type === t);
      const mbtiA = byType("mbti");
      const wptA = byType("wpt");
      const discA = byType("disc");
      const base = mbtiA ?? wptA ?? discA ?? g.attempts[0];
      if (!base) throw new Error("Belum ada hasil test untuk kandidat ini");

      const baseDetail = await answerRows(base.id);
      const cand = baseDetail.d.attempt?.candidates ?? {};
      const rowsFor = async (a: any) =>
        a ? (a.id === base.id ? baseDetail.rows : (await answerRows(a.id)).rows) : null;

      const mbtiAnswers = await rowsFor(mbtiA);
      const wptAnswers = await rowsFor(wptA);
      const discAnswers = await rowsFor(discA);
      const testDate =
        [mbtiA, wptA, discA, base].find((a) => a?.finished_at)?.finished_at ?? base.started_at ?? null;

      const out = await exportProfilingExcel({
        candidate: {
          full_name: cand.full_name ?? g.name,
          age: cand.age,
          birth_date: cand.birth_date,
          education: cand.education,
          major: cand.major,
          school_name: cand.school_name,
          position_applied: cand.position_applied ?? g.position,
        },
        testDate,
        mbtiAnswers,
        wptAnswers,
        discAnswers,
      });
      toast.success(
        `Profiling ${g.name} diunduh${out.iq !== null ? ` — IQ ${out.iq} (${out.status})` : ""}`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal membuat Profiling");
    } finally {
      setProfilingKey(null);
    }
  }



  const [bulkKey, setBulkKey] = useState<string | null>(null);

  async function downloadGroupDocs(g: Group) {
    setBulkKey(g.key);
    let ok = 0;
    let skipped = 0;
    try {
      for (const r of g.attempts) {
        try {
          const done = await exportAttemptDoc(r, g);
          if (done) ok++;
          else skipped++;
        } catch {
          skipped++;
        }
        await new Promise((res) => setTimeout(res, 350));
      }
      if (ok)
        toast.success(
          `${ok} dokumen hasil ${g.name} diunduh${skipped ? ` · ${skipped} dilewati` : ""}`,
        );
      else toast.error("Tidak ada dokumen hasil yang bisa diunduh untuk kandidat ini");
    } finally {
      setBulkKey(null);
    }
  }

  const rows = useMemo(() => {
    const all = (data?.attempts ?? []) as any[];
    const needle = q.trim().toLowerCase();
    return all.filter((a) => {
      if (candidateTrackOf(a.candidates) !== track) return false;
      if (type !== "all" && a.tests?.test_type !== type) return false;
      if (status !== "all" && a.status !== status) return false;
      if (!needle) return true;
      return [
        a.candidates?.full_name,
        a.candidates?.candidate_codes?.code ?? a.candidates?.code_snapshot,
        a.candidates?.position_applied,
        a.tests?.name,
      ]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(needle));
    });
  }, [data, q, type, status, track]);

  // Kelompokkan per nama kandidat, urut test dari awal sampai akhir
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    rows.forEach((r) => {
      const c = r.candidates ?? {};
      const key = String(c.id ?? c.full_name ?? r.candidate_id ?? "tanpa-nama");
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          name: c.full_name ?? "(Tanpa Nama)",
          code: c.candidate_codes?.code ?? c.code_snapshot ?? "-",
          position: c.position_applied ?? "-",
          attempts: [],
          finished: 0,
        };
        map.set(key, g);
      }
      g.attempts.push(r);
    });
    const list = Array.from(map.values());
    list.forEach((g) => {
      g.attempts.sort(
        (a, b) => new Date(a.started_at ?? 0).getTime() - new Date(b.started_at ?? 0).getTime(),
      );
      g.finished = g.attempts.filter((a) => a.status === "finished").length;
      g.first = g.attempts[0]?.started_at ?? null;
      g.last =
        g.attempts[g.attempts.length - 1]?.finished_at ??
        g.attempts[g.attempts.length - 1]?.started_at ??
        null;
    });
    list.sort((a, b) => a.name.localeCompare(b.name, "id"));
    return list;
  }, [rows]);

  const trackCounts = useMemo(() => {
    const all = (data?.attempts ?? []) as any[];
    return {
      magang: all.filter((a) => candidateTrackOf(a.candidates) === "magang").length,
      karyawan: all.filter((a) => candidateTrackOf(a.candidates) === "karyawan").length,
    };
  }, [data]);

  const types = useMemo(
    () =>
      Array.from(
        new Set(((data?.attempts ?? []) as any[]).map((a) => a.tests?.test_type).filter(Boolean)),
      ),
    [data],
  );

  const finished = rows.filter((r) => r.status === "finished");
  const avg = finished.length
    ? Math.round(finished.reduce((s, r) => s + Number(r.score ?? 0), 0) / finished.length)
    : 0;

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = [
      "No",
      "Kandidat",
      "Kode",
      "Posisi",
      "Urutan Test",
      "Test",
      "Tipe",
      "Status",
      "Skor",
      "Ringkasan",
      "Mulai",
      "Selesai",
    ];
    const lines = [header.map(esc).join(",")];
    groups.forEach((g, gi) => {
      g.attempts.forEach((r, ai) => {
        lines.push(
          [
            gi + 1,
            g.name,
            g.code,
            g.position,
            ai + 1,
            r.tests?.name ?? "-",
            r.tests?.test_type ?? "-",
            r.status,
            r.status === "finished" ? (r.score ?? "") : "",
            summarize(r),
            fmt(r.started_at),
            fmt(r.finished_at),
          ]
            .map(esc)
            .join(","),
        );
      });
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bank-hasil-psikotest-${track}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Bank Data Hasil</h1>
          <p className="text-sm text-muted-foreground">
            Tersimpan terpisah per jalur kandidat (Magang / Karyawan). Hanya Admin &amp; HR yang
            dapat melihat skor.
          </p>
          <TrackTabs value={track} onChange={setTrack} counts={trackCounts} className="mt-4" />
        </div>
        <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!groups.length}>
          <FileDown className="mr-2 h-4 w-4" /> Ekspor CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Kandidat", value: groups.length, icon: Users },
          { label: "Total Attempt", value: rows.length, icon: BarChart3 },
          { label: "Selesai", value: finished.length, icon: BarChart3 },
          { label: "Rata-rata Skor", value: avg, icon: BarChart3 },
        ].map((c) => (
          <Card key={c.label} className="shadow-card">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <div className="text-sm text-muted-foreground">{c.label}</div>
                <div className="mt-1 font-display text-2xl font-bold text-primary">{c.value}</div>
              </div>
              <c.icon className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader className="gap-3">
          <CardTitle className="text-base">Rekap Hasil Psikotest per Kandidat</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              placeholder="Cari nama / kode / posisi / test..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="all">Semua tipe</option>
              {types.map((t) => (
                <option key={t as string} value={t as string}>
                  {String(t).toUpperCase()}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Semua status</option>
              <option value="finished">Selesai</option>
              <option value="in_progress">Berjalan</option>
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setOpen((o) => {
                  const allOpen = groups.every((g) => o[g.key]);
                  return allOpen ? {} : Object.fromEntries(groups.map((g) => [g.key, true]));
                })
              }
              disabled={!groups.length}
            >
              {groups.every((g) => open[g.key]) && groups.length ? "Tutup semua" : "Buka semua"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Memuat...</div>
          ) : !groups.length ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Belum ada hasil psikotest.
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((g, gi) => {
                const isOpen = !!open[g.key];
                return (
                  <div key={g.key} className="rounded-lg border">
                    <div className="flex items-center gap-1 pr-3">
                      <button
                        type="button"
                        onClick={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))}
                        className="flex flex-1 flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="w-6 text-sm text-muted-foreground">{gi + 1}.</span>
                        <FolderOpen className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{g.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{g.code}</span>
                        <span className="text-xs text-muted-foreground">{g.position}</span>
                        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{g.attempts.length} test</Badge>
                          <Badge className="bg-success">{g.finished} selesai</Badge>
                          <span className="hidden sm:inline">
                            Awal: {fmt(g.first)} → Akhir: {fmt(g.last)}
                          </span>
                        </span>
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        disabled={resumeKey === g.key}
                        title="Unduh Recruitment Resume (Excel) kandidat ini"
                        onClick={(e) => {
                          e.stopPropagation();
                          void downloadResume(g);
                        }}
                      >
                        <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />
                        {resumeKey === g.key ? "Menyiapkan..." : "Resume"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        disabled={profilingKey === g.key}
                        title="Unduh Profiling (Excel) — persentase MBTI + IQ WPT"
                        onClick={(e) => {
                          e.stopPropagation();
                          void downloadProfiling(g);
                        }}
                      >
                        <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />
                        {profilingKey === g.key ? "Menyiapkan..." : "Profiling"}
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        className="shrink-0"
                        disabled={bulkKey === g.key}
                        title="Unduh semua dokumen hasil test kandidat ini"
                        onClick={(e) => {
                          e.stopPropagation();
                          void downloadGroupDocs(g);
                        }}
                      >
                        <FileDown className="mr-1 h-3.5 w-3.5" />
                        {bulkKey === g.key ? "Menyiapkan..." : "Unduh semua"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Hapus hasil psikotest ${g.name}`}
                        title="Hapus seluruh hasil test kandidat ini"
                        onClick={(e) => {
                          e.stopPropagation();
                          setToDelete(g);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {isOpen && (
                      <div className="overflow-x-auto border-t px-4 py-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                              <th className="py-2 pr-2">Urutan</th>
                              <th className="py-2 pr-2">Test</th>
                              <th className="py-2 pr-2">Status</th>
                              <th className="py-2 pr-2">Skor</th>
                              <th className="py-2 pr-2">Ringkasan</th>
                              <th className="py-2 pr-2">Mulai</th>
                              <th className="py-2 pr-2">Selesai</th>
                              <th className="py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {g.attempts.map((r, ai) => (
                              <Fragment key={r.id}>
                                <tr className="border-b last:border-0">
                                  <td className="py-2 pr-2 text-muted-foreground">{ai + 1}</td>
                                  <td className="py-2 pr-2">
                                    {r.tests?.name ?? "-"}
                                    <div>
                                      <Badge variant="outline" className="mt-1 uppercase">
                                        {r.tests?.test_type}
                                      </Badge>
                                    </div>
                                  </td>
                                  <td className="py-2 pr-2">
                                    {r.status === "finished" ? (
                                      <Badge className="bg-success">Selesai</Badge>
                                    ) : (
                                      <Badge variant="secondary">Berjalan</Badge>
                                    )}
                                  </td>
                                  <td className="py-2 pr-2 font-semibold text-primary">
                                    {r.status === "finished" ? (r.score ?? "-") : "-"}
                                  </td>
                                  <td className="py-2 pr-2 text-xs text-muted-foreground">
                                    {summarize(r)}
                                  </td>
                                  <td className="py-2 pr-2 text-xs text-muted-foreground">
                                    {fmt(r.started_at)}
                                  </td>
                                  <td className="py-2 pr-2 text-xs text-muted-foreground">
                                    {fmt(r.finished_at)}
                                  </td>
                                  <td className="py-2">
                                    <div className="flex gap-2">
                                      <Button asChild size="sm" variant="outline">
                                        <Link to="/admin/attempts/$id" params={{ id: r.id }}>
                                          <Eye className="mr-1 h-3.5 w-3.5" /> Detail
                                        </Link>
                                      </Button>
                                      {!["mbti", "eq", "wpt", "disc", "papi", "msdt"].includes(
                                        String(r.tests?.test_type),
                                      ) && (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={async () => {
                                            try {
                                              await exportGenericSheet(r);
                                              toast.success("Lembar hasil PDF diunduh");
                                            } catch (e: any) {
                                              toast.error(
                                                e?.message ?? "Gagal membuat lembar hasil",
                                              );
                                            }
                                          }}
                                        >
                                          <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Lembar
                                          Hasil
                                        </Button>
                                      )}
                                      {r.tests?.test_type === "mbti" && (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={async () => {
                                            try {
                                              const d: any = await detailFn({ data: { id: r.id } });
                                              const map = new Map<string, any>(
                                                (d.attempt?.test_answers ?? []).map((x: any) => [
                                                  x.question_id,
                                                  x,
                                                ]),
                                              );
                                              const rows = (d.questions ?? []).map((q: any) => ({
                                                question_number: q.question_number,
                                                answer: map.get(q.id)?.answer,
                                              }));
                                              const { filled, type } = await exportMbtiExcel(rows, {
                                                candidateName: g.name,
                                                candidateCode: g.code,
                                                position: g.position,
                                                finishedAt: r.finished_at,
                                              });
                                              toast.success(
                                                `Excel MBTI diunduh — tipe ${type} (${filled}/60 jawaban)`,
                                              );
                                            } catch (e: any) {
                                              toast.error(e?.message ?? "Gagal membuat file Excel");
                                            }
                                          }}
                                        >
                                          <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel
                                        </Button>
                                      )}
                                      {r.tests?.test_type === "eq" && (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={async () => {
                                            try {
                                              const d: any = await detailFn({ data: { id: r.id } });
                                              const map = new Map<string, any>(
                                                (d.attempt?.test_answers ?? []).map((x: any) => [
                                                  x.question_id,
                                                  x,
                                                ]),
                                              );
                                              const rows = (d.questions ?? []).map((q: any) => ({
                                                question_number: q.question_number,
                                                answer: map.get(q.id)?.answer,
                                              }));
                                              const { filled, strongest, summary } =
                                                await exportEqExcel(rows, {
                                                  candidateName: g.name,
                                                  candidateCode: g.code,
                                                  position: g.position,
                                                  finishedAt: r.finished_at,
                                                });
                                              toast.success(
                                                `Excel EQ diunduh — terkuat ${summary[strongest].label} (${filled}/50 jawaban)`,
                                              );
                                            } catch (e: any) {
                                              toast.error(e?.message ?? "Gagal membuat file Excel");
                                            }
                                          }}
                                        >
                                          <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel
                                        </Button>
                                      )}
                                      {r.tests?.test_type === "wpt" && (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={async () => {
                                            try {
                                              const d: any = await detailFn({ data: { id: r.id } });
                                              const map = new Map<string, any>(
                                                (d.attempt?.test_answers ?? []).map((x: any) => [
                                                  x.question_id,
                                                  x,
                                                ]),
                                              );
                                              const rows = (d.questions ?? []).map((q: any) => ({
                                                question_number: q.question_number,
                                                answer: map.get(q.id)?.answer,
                                              }));
                                              const { total, iq, category } = await exportWptExcel(
                                                rows,
                                                {
                                                  candidateName: g.name,
                                                  candidateCode: g.code,
                                                  position: g.position,
                                                  finishedAt: r.finished_at,
                                                },
                                              );
                                              toast.success(
                                                `Excel WPT diunduh — benar ${total}/50, IQ ${iq} (${category})`,
                                              );
                                            } catch (e: any) {
                                              toast.error(e?.message ?? "Gagal membuat file Excel");
                                            }
                                          }}
                                        >
                                          <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel
                                        </Button>
                                      )}
                                      {r.tests?.test_type === "msdt" && (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={async () => {
                                            try {
                                              const d: any = await detailFn({ data: { id: r.id } });
                                              const map = new Map<string, any>(
                                                (d.attempt?.test_answers ?? []).map((x: any) => [
                                                  x.question_id,
                                                  x,
                                                ]),
                                              );
                                              const picks: Record<number, string> = {};
                                              for (const q of d.questions ?? []) {
                                                const ans = String(map.get(q.id)?.answer ?? "")
                                                  .trim()
                                                  .toUpperCase();
                                                if (ans === "A" || ans === "B")
                                                  picks[q.question_number] = ans;
                                              }
                                              const res = await exportMsdtExcel(picks, {
                                                candidateName: g.name,
                                                candidateCode: g.code,
                                                position: g.position,
                                                finishedAt: r.finished_at,
                                              });
                                              toast.success(
                                                `Excel MSDT diunduh — ${res.answered}/${res.total} item, gaya dominan ${res.dominant}`,
                                              );
                                            } catch (e: any) {
                                              toast.error(e?.message ?? "Gagal membuat file Excel");
                                            }
                                          }}
                                        >
                                          <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel
                                        </Button>
                                      )}
                                      {r.tests?.test_type === "papi" && (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={async () => {
                                            try {
                                              const d: any = await detailFn({ data: { id: r.id } });
                                              const map = new Map<string, any>(
                                                (d.attempt?.test_answers ?? []).map((x: any) => [
                                                  x.question_id,
                                                  x,
                                                ]),
                                              );
                                              const picks: Record<number, string> = {};
                                              for (const q of d.questions ?? []) {
                                                const ans = String(map.get(q.id)?.answer ?? "")
                                                  .trim()
                                                  .toUpperCase();
                                                if (ans === "A" || ans === "B")
                                                  picks[q.question_number] = ans;
                                              }
                                              const res = await exportPapiExcel(picks, {
                                                candidateName: g.name,
                                                candidateCode: g.code,
                                                position: g.position,
                                                finishedAt: r.finished_at,
                                              });
                                              toast.success(
                                                `Excel PAPI diunduh — ${res.answered}/${res.total} item, skala tertinggi ${res.highest.join(", ") || "-"}`,
                                              );
                                            } catch (e: any) {
                                              toast.error(e?.message ?? "Gagal membuat file Excel");
                                            }
                                          }}
                                        >
                                          <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel
                                        </Button>
                                      )}
                                      {r.tests?.test_type === "disc" && (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={async () => {
                                            try {
                                              const d: any = await detailFn({ data: { id: r.id } });
                                              const map = new Map<string, any>(
                                                (d.attempt?.test_answers ?? []).map((x: any) => [
                                                  x.question_id,
                                                  x,
                                                ]),
                                              );
                                              const rows = (d.questions ?? []).map((q: any) => ({
                                                question_number: q.question_number,
                                                answer: map.get(q.id)?.answer,
                                              }));
                                               const res: any = await exportDiscExcel(rows, {
                                                 ...buildCandidateMeta(
                                                   d.attempt?.candidates ?? {},
                                                   { finishedAt: r.finished_at },
                                                 ),
                                                 candidateName: g.name,
                                                 candidateCode: g.code,
                                               });
                                              toast.success(
                                                `Excel DISC diunduh — ${res?.filled ?? 0}/${res?.total ?? 24} kelompok terisi`,
                                              );
                                            } catch (e: any) {
                                              toast.error(e?.message ?? "Gagal membuat file Excel");
                                            }
                                          }}
                                        >
                                          <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus hasil psikotest kandidat?</AlertDialogTitle>
            <AlertDialogDescription>
              Seluruh {toDelete?.attempts.length ?? 0} hasil test milik{" "}
              {toDelete?.name ?? "kandidat ini"} beserta lembar jawabannya akan dihapus permanen.
              Biodata dan kode akses tetap tersimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteGroup();
              }}
            >
              {deleting ? "Menghapus..." : "Hapus hasil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
