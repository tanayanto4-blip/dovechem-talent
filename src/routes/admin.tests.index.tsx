import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listTests } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, ArrowRight, Timer, Search, X } from "lucide-react";
import { TestDurationEditor } from "@/components/test-duration-editor";
import { TestPublishToggle } from "@/components/publish-toggle";
import { TestAudienceEditor } from "@/components/test-audience-editor";
import { TrackTabs } from "@/components/track-tabs";
import { audienceMatches, testAudienceLabel, jobLevelLabel, type CandidateType } from "@/lib/candidate-type";
import { LevelTabs, type LevelFilter } from "@/components/level-tabs";


export const Route = createFileRoute("/admin/tests/")({ head: () => ({ meta: [
    { title: "Bank Soal Psikotest — Admin Dover Chemical" },
    { name: "description", content: "Kelola daftar psikotest, durasi pengerjaan, serta status publish bank soal PT Dover Chemical." },
    { property: "og:title", content: "Bank Soal Psikotest — Admin Dover Chemical" },
    { property: "og:description", content: "Kelola daftar psikotest, durasi pengerjaan, serta status publish bank soal PT Dover Chemical." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: TestsList });

function TestsList() {
  const fn = useServerFn(listTests);
  const { data, isLoading } = useQuery({ queryKey: ["admin-tests"], queryFn: () => fn({ data: {} as never }) });

  const [track, setTrack] = useState<CandidateType>("magang");
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [testId, setTestId] = useState<string>("all");

  const allTests = (data?.tests ?? []) as any[];
  const trackCounts = useMemo(
    () => ({
      magang: allTests.filter((t) => audienceMatches(t.audience, "magang")).length,
      karyawan: allTests.filter((t) => audienceMatches(t.audience, "karyawan")).length,
    }),
    [allTests],
  );
  const levelCounts = useMemo(
    () => ({
      all: allTests.filter((t) => audienceMatches(t.audience, "karyawan")).length,
      staff: allTests.filter((t) => audienceMatches(t.audience, "karyawan", "staff")).length,
      spv_up: allTests.filter((t) => audienceMatches(t.audience, "karyawan", "spv_up")).length,
    }),
    [allTests],
  );
  const tests = useMemo(
    () =>
      allTests.filter((t) =>
        audienceMatches(t.audience, track, track === "karyawan" && level !== "all" ? level : null),
      ),
    [allTests, track, level],
  );
  const categories = useMemo(() => Array.from(new Set(tests.map((t) => t.test_type))).sort(), [tests]);
  const idOptions = useMemo(() => {
    const src = category === "all" ? tests : tests.filter((t) => t.test_type === category);
    return src.map((t) => ({ id: t.id, name: t.name }));
  }, [tests, category]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return tests.filter((t) => {
      if (category !== "all" && t.test_type !== category) return false;
      if (status === "published" && !t.active) return false;
      if (status === "draft" && t.active) return false;
      if (testId !== "all" && t.id !== testId) return false;
      if (!s) return true;
      return `${t.name} ${t.description ?? ""} ${t.test_type} ${t.id}`.toLowerCase().includes(s);
    });
  }, [tests, search, category, status, testId]);

  const hasFilter = search || category !== "all" || status !== "all" || testId !== "all";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">Bank Soal Psikotest</h1>
        <p className="text-sm text-muted-foreground">
          Bank soal dipisah per jalur kandidat. Pilih jalur untuk melihat paket test-nya.
        </p>
        <TrackTabs value={track} onChange={(v) => { setTrack(v); setTestId("all"); }} counts={trackCounts} className="mt-4" />
      </div>

      <Card className="shadow-card">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_180px_180px_220px_auto]">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, deskripsi, atau ID test…"
              className="pl-8"
            />
          </div>
          <Select value={category} onValueChange={(v) => { setCategory(v); setTestId("all"); }}>
            <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua kategori</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Select value={testId} onValueChange={setTestId}>
            <SelectTrigger><SelectValue placeholder="Test ID" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua test</SelectItem>
              {idOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            disabled={!hasFilter}
            onClick={() => { setSearch(""); setCategory("all"); setStatus("all"); setTestId("all"); }}
          >
            <X className="mr-2 h-4 w-4" /> Reset
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-muted-foreground">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Tidak ada bank soal yang cocok dengan filter.
        </div>
      ) : (
        <>
          <div className="text-xs text-muted-foreground">Menampilkan {filtered.length} dari {tests.length} test.</div>
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((t: any) => (
              <Card key={t.id} className="shadow-card">
                <CardContent className="p-6">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-md bg-hero text-primary-foreground">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <Badge variant={t.active ? "default" : "secondary"}>{t.active ? "Published" : "Draft"}</Badge>
                  </div>
                  <h3 className="font-display text-lg font-bold text-primary">{t.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="uppercase">{t.test_type}</span>
                    <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> {t.duration_minutes} menit</span>
                    <span>{t.question_count} soal</span>
                    <span>{testAudienceLabel(t.audience)}</span>
                    <span className="font-mono text-[10px] opacity-70">ID: {t.id.slice(0, 8)}…</span>
                  </div>
                  <div className="mt-4">
                    <TestPublishToggle testId={t.id} testName={t.name} active={!!t.active} />
                  </div>
                  <div className="mt-3">
                    <TestAudienceEditor testId={t.id} testName={t.name} value={t.audience} />
                  </div>
                  <div className="mt-3">
                    <TestDurationEditor testId={t.id} testName={t.name} value={t.duration_minutes} />
                  </div>
                  <Button asChild className="mt-4 w-full">
                    <Link to="/admin/tests/$id" params={{ id: t.id }}>
                      {t.test_type === "mbti" ? "Kelola Soal MBTI" : "Lihat Soal"} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
