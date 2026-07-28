import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles, listProctorSessions, getProctorSession } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, RefreshCw, ShieldAlert, Video, VideoOff, AlertTriangle, CheckCircle2, CircleOff, Radio } from "lucide-react";

export const Route = createFileRoute("/admin/proctoring")({
  ssr: false,
  component: ProctoringPage,
  head: () => ({
    meta: [
      { title: "Pantauan Kamera Kandidat | Dover Chemical" },
      { name: "description", content: "Monitor kamera kandidat selama pelaksanaan psikotest — khusus Super Admin." },
      { property: "og:title", content: "Pantauan Kamera Kandidat" },
      { property: "og:description", content: "Monitor kamera kandidat selama pelaksanaan psikotest — khusus Super Admin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const EVENT_LABEL: Record<string, string> = {
  snapshot: "Frame kamera",
  camera_on: "Kamera diaktifkan",
  camera_off: "Kamera terputus",
  camera_denied: "Izin kamera ditolak",
  tab_hidden: "Meninggalkan halaman tes",
};

const EVENT_SEVERITY: Record<string, "info" | "warning" | "danger"> = {
  snapshot: "info",
  camera_on: "info",
  camera_off: "danger",
  camera_denied: "danger",
  tab_hidden: "warning",
};

type SessionStatus = "live" | "live-warning" | "idle" | "finished" | "inactive";

function getSessionStatus(s: any): { status: SessionStatus; label: string; sinceText: string } {
  const now = Date.now();
  const lastMs = now - new Date(s.last_captured_at).getTime();
  const lastEvent = s.last_event ?? "snapshot";
  const isAlertEvent = lastEvent !== "snapshot" && lastEvent !== "camera_on";
  const inProgress = s.attempt_status === "in_progress";
  const finished = s.attempt_status === "completed" || s.attempt_status === "submitted" || s.attempt_status === "finished";

  const sinceText = lastMs < 15_000
    ? "live"
    : lastMs < 60_000
    ? "baru saja"
    : lastMs < 60 * 60 * 1000
      ? `${Math.round(lastMs / 60_000)} menit lalu`
      : `${Math.round(lastMs / 3_600_000)} jam lalu`;

  if (inProgress && lastMs < 30_000) {
    return { status: isAlertEvent ? "live-warning" : "live", label: isAlertEvent ? "LIVE · Perlu perhatian" : "LIVE · Diawasi", sinceText };
  }
  if (inProgress) {
    return { status: "idle", label: "IDLE · Tidak ada frame baru", sinceText };
  }
  if (finished) {
    return { status: "finished", label: "SELESAI", sinceText };
  }
  return { status: "inactive", label: "TIDAK AKTIF", sinceText };
}

function ProctoringPage() {
  const rolesFn = useServerFn(getMyRoles);
  const listFn = useServerFn(listProctorSessions);
  const detailFn = useServerFn(getProctorSession);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [openAttempt, setOpenAttempt] = useState<{ attempt_id?: string; candidate_id?: string; name: string } | null>(null);

  const { data: roles } = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn({ data: {} as never }) });
  const isAdmin = !!roles?.roles?.includes("admin");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["proctor-sessions"],
    queryFn: () => listFn({ data: {} as never }),
    enabled: isAdmin,
    refetchInterval: 4_000,
    refetchIntervalInBackground: true,
  });

  const detail = useQuery({
    queryKey: ["proctor-session", openKey],
    queryFn: () => detailFn({ data: { attempt_id: openAttempt?.attempt_id, candidate_id: openAttempt?.attempt_id ? undefined : openAttempt?.candidate_id } }),
    enabled: !!openKey && isAdmin,
    refetchInterval: 5_000,
  });

  if (roles && !isAdmin) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="space-y-2 py-10 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
          <div className="font-medium text-destructive">Akses terbatas</div>
          <p className="text-sm text-muted-foreground">Pantauan kamera hanya dapat diakses oleh Super Admin.</p>
        </CardContent>
      </Card>
    );
  }

  const sessions = data?.sessions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary">Pantauan Kamera Kandidat</h1>
          <p className="text-sm text-muted-foreground">
            Frame kamera diperbarui otomatis setiap 5 detik (tampilan near-live) selama kandidat mengerjakan psikotest (24 jam terakhir).
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Segarkan
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="flex items-center justify-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat pantauan...</CardContent></Card>
      ) : sessions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Belum ada aktivitas kamera kandidat dalam 24 jam terakhir.</CardContent></Card>
      ) : (
        <div className="grid gap-4 rounded-xl bg-neutral-950 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s: any, idx: number) => {
            const { status, label, sinceText } = getSessionStatus(s);
            const lastEvent = s.last_event ?? "snapshot";
            const eventSeverity = EVENT_SEVERITY[lastEvent] ?? "info";
            const eventLabel = EVENT_LABEL[lastEvent] ?? lastEvent;

            const statusChip = {
              live: { icon: Radio, classes: "bg-success/90 text-success-foreground", dot: "bg-white animate-pulse" },
              "live-warning": { icon: AlertTriangle, classes: "bg-warning/90 text-warning-foreground", dot: "bg-destructive animate-pulse" },
              idle: { icon: CircleOff, classes: "bg-neutral-700 text-neutral-200", dot: "bg-neutral-400" },
              finished: { icon: CheckCircle2, classes: "bg-secondary text-secondary-foreground", dot: "bg-secondary-foreground" },
              inactive: { icon: VideoOff, classes: "bg-neutral-800 text-neutral-300", dot: "bg-neutral-500" },
            }[status];
            const StatusIcon = statusChip.icon;
            const camNo = String(idx + 1).padStart(2, "0");

            return (
              <div
                key={s.key}
                className="overflow-hidden rounded-lg border-2 border-neutral-700 bg-neutral-900 shadow-lg ring-1 ring-black/50"
              >
                {/* CCTV viewport */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                  {s.latest_url ? (
                    <img
                      key={s.latest_url}
                      src={s.latest_url}
                      alt={`Frame kamera ${s.candidate_name}`}
                      className="h-full w-full object-cover contrast-110 saturate-75"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-neutral-500">
                      <VideoOff className="h-8 w-8" />
                      <span className="font-mono text-[11px] tracking-widest">NO SIGNAL</span>
                    </div>
                  )}

                  {/* scanline + vignette overlay */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay"
                    style={{ backgroundImage: "repeating-linear-gradient(to bottom, rgba(255,255,255,.35) 0px, rgba(255,255,255,.35) 1px, transparent 1px, transparent 3px)" }}
                  />
                  <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.85)]" />
                  {/* corner brackets */}
                  <span className="pointer-events-none absolute left-1.5 top-1.5 h-4 w-4 border-l-2 border-t-2 border-white/40" />
                  <span className="pointer-events-none absolute right-1.5 top-1.5 h-4 w-4 border-r-2 border-t-2 border-white/40" />
                  <span className="pointer-events-none absolute bottom-1.5 left-1.5 h-4 w-4 border-b-2 border-l-2 border-white/40" />
                  <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-4 w-4 border-b-2 border-r-2 border-white/40" />

                  {/* top bar: CAM id + REC */}
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-2.5 py-1.5">
                    <span className="font-mono text-[11px] font-semibold tracking-widest text-white/90">CAM {camNo}</span>
                    {(status === "live" || status === "live-warning") && (
                      <span className="flex items-center gap-1 font-mono text-[11px] font-bold tracking-widest text-red-500">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" /> REC
                      </span>
                    )}
                  </div>

                  {/* bottom bar: name + timestamp */}
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent px-2.5 py-1.5">
                    <span className="truncate font-mono text-[11px] uppercase tracking-wide text-white/90">
                      {s.candidate_name}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-white/80">
                      {new Date(s.last_captured_at).toLocaleTimeString("id-ID", { hour12: false })}
                    </span>
                  </div>

                  {/* status chip */}
                  <span className={`absolute left-2 top-8 inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${statusChip.classes}`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusChip.dot}`} />
                    <StatusIcon className="h-3 w-3" />
                    {label}
                  </span>
                </div>

                {/* info panel */}
                <div className="space-y-3 border-t border-neutral-700 bg-neutral-900 p-3 text-xs text-neutral-300">
                  <div>
                    <div className="font-display text-sm font-semibold text-white">{s.candidate_name}</div>
                    <div className="font-mono text-[11px] text-neutral-400">
                      {s.candidate_code ? <>{s.candidate_code} · </> : null}{s.position ?? "-"}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">{s.test_name}</Badge>
                    <Badge variant="outline" className="border-neutral-600 text-neutral-300">{s.frames} frame</Badge>
                    {s.alerts > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {s.alerts} peringatan
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5 rounded-sm border border-neutral-700 bg-black/40 p-2.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">STATUS</span>
                      <span className={eventSeverity === "danger" ? "text-red-400" : eventSeverity === "warning" ? "text-amber-400" : "text-neutral-100"}>
                        {eventLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">UPDATE</span>
                      <span className="text-neutral-100">{sinceText}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">FRAME</span>
                      <span className="text-neutral-100">{new Date(s.last_captured_at).toLocaleTimeString("id-ID", { hour12: false })}</span>
                    </div>
                  </div>

                  {status === "live-warning" && (
                    <div className="flex items-start gap-2 rounded-sm border border-red-500/40 bg-red-500/10 p-2.5 text-red-300">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-semibold">Perhatian kandidat</div>
                        <div className="opacity-90">{eventLabel}. Segera periksa riwayat kamera untuk detailnya.</div>
                      </div>
                    </div>
                  )}
                  {status === "idle" && (
                    <div className="flex items-start gap-2 rounded-sm border border-amber-500/40 bg-amber-500/10 p-2.5 text-amber-300">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-semibold">Tidak ada frame baru</div>
                        <div className="opacity-90">Kamera mungkin terputus atau kandidat keluar dari tab tes.</div>
                      </div>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-neutral-600 bg-transparent text-neutral-200 hover:bg-neutral-800 hover:text-white"
                    onClick={() => {
                      setOpenAttempt({ attempt_id: s.attempt_id ?? undefined, candidate_id: s.candidate_id, name: s.candidate_name });
                      setOpenKey(s.key);
                    }}
                  >
                    <Video className="mr-2 h-4 w-4" /> Lihat riwayat kamera
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

      )}

      <Dialog open={!!openKey} onOpenChange={(o) => { if (!o) { setOpenKey(null); setOpenAttempt(null); } }}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-auto">
          <DialogTitle>Riwayat kamera — {openAttempt?.name}</DialogTitle>
          <DialogDescription className="text-xs">
            Seluruh frame dan peristiwa kamera selama sesi psikotest. Tautan gambar bersifat sementara.
          </DialogDescription>
          {detail.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat...</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
              {(detail.data?.snapshots ?? []).map((f: any) => (
                <figure key={f.id} className="overflow-hidden rounded-md border">
                  {f.url ? (
                    <img src={f.url} alt={`Frame ${new Date(f.captured_at).toLocaleTimeString("id-ID")}`} className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-center text-[10px] text-muted-foreground">
                      {EVENT_LABEL[f.event] ?? f.event}
                    </div>
                  )}
                  <figcaption className="px-2 py-1 text-[10px] text-muted-foreground">
                    {new Date(f.captured_at).toLocaleString("id-ID")}
                    {f.event !== "snapshot" && <span className="ml-1 font-medium text-destructive">· {EVENT_LABEL[f.event] ?? f.event}</span>}
                  </figcaption>
                </figure>
              ))}
              {(detail.data?.snapshots ?? []).length === 0 && (
                <div className="col-span-full py-8 text-center text-sm text-muted-foreground">Tidak ada frame.</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
