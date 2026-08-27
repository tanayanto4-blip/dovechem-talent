import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  liveMonitorOverview,
  resetCandidateDevice,
  autoRecoverStuckCandidates,
} from "@/lib/monitoring.functions";
import { reopenCandidateTest } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PresenceBadge } from "@/components/presence-badge";
import { Activity, Smartphone, TimerReset, Users, AlertCircle, ShieldCheck } from "lucide-react";


const INCIDENT_LABEL: Record<string, string> = {
  "koneksi-terputus": "Sinyal kandidat terputus",
  "koneksi-pulih": "Sinyal kandidat pulih",
  "autosave-gagal": "Jawaban gagal tersimpan",
  "logout-perangkat-lain": "Terlogout (kode dipakai perangkat lain)",
  "sesi-tidak-valid": "Sesi kandidat ditolak",
  "test-auto-submit": "Test terkirim otomatis (waktu habis)",
  "kirim-jawaban-gagal": "Gagal kirim jawaban",
};

function incidentLabel(source: string) {
  const kind = source.replace(/^insiden:/, "");
  return INCIDENT_LABEL[kind] ?? kind;
}

/** Pusat pemantauan real-time kandidat + aksi perbaikan cepat. */
export function LiveMonitor({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const overviewFn = useServerFn(liveMonitorOverview);
  const resetDeviceFn = useServerFn(resetCandidateDevice);
  const reopenFn = useServerFn(reopenCandidateTest);

  const { data } = useQuery({
    queryKey: ["live-monitor"],
    queryFn: () => overviewFn({ data: {} as never }),
    refetchInterval: 10_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["live-monitor"] });

  const resetDevice = useMutation({
    mutationFn: (code_id: string) => resetDeviceFn({ data: { code_id } }),
    onSuccess: () => {
      toast.success("Kunci perangkat dilepas — kandidat bisa login kembali");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetAttempt = useMutation({
    mutationFn: (v: { candidate_id: string; test_id: string }) =>
      reopenFn({
        data: {
          candidate_id: v.candidate_id,
          test_id: v.test_id,
          clear_answers: false,
          reason: "Perbaikan dari Pusat Monitoring (test macet)",
        },
      }),
    onSuccess: () => {
      toast.success("Test dibuka ulang untuk kandidat");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const autoFn = useServerFn(autoRecoverStuckCandidates);
  const [autoOn, setAutoOn] = useState(false);
  const [lastRun, setLastRun] = useState<{ at: string; count: number } | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAutoOn(window.localStorage.getItem("auto-recovery") === "on");
  }, []);

  const autoRecover = useMutation({
    mutationFn: () => autoFn({ data: { dry_run: false } }),
    onSuccess: (res) => {
      setLastRun({ at: res.ran_at, count: res.actions.length });
      if (res.actions.length) {
        toast.success(`Auto-recovery: ${res.actions.length} tindakan perbaikan dijalankan`);
        invalidate();
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!autoOn || !isAdmin) return;
    const tick = async () => {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        await autoRecover.mutateAsync();
      } catch {
        /* error sudah ditampilkan lewat toast */
      } finally {
        runningRef.current = false;
      }
    };
    void tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOn, isAdmin]);

  const toggleAuto = (v: boolean) => {
    setAutoOn(v);
    window.localStorage.setItem("auto-recovery", v ? "on" : "off");
    toast.info(v ? "Mode auto-recovery aktif" : "Mode auto-recovery dimatikan");
  };


  const s = data?.summary;
  const cards = [
    { label: "Kandidat online", value: s?.online ?? 0, icon: Users },
    { label: "Test berjalan", value: s?.running ?? 0, icon: Activity },
    { label: "Test macet", value: s?.stuck ?? 0, icon: TimerReset },
    { label: "Insiden terbuka", value: s?.openIncidents ?? 0, icon: AlertCircle },
  ];

  const online = (data?.codes ?? []).filter((c) => c.online);
  const running = data?.running ?? [];
  const incidents = data?.incidents ?? [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {c.label}
                </div>
                <div className="font-display text-3xl font-bold text-primary">{c.value}</div>
              </div>
              <c.icon className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div className="min-w-[220px] flex-1">
              <Label htmlFor="auto-recovery" className="text-sm font-semibold">
                Mode auto-recovery
              </Label>
              <p className="text-xs text-muted-foreground">
                Setiap menit sistem memeriksa test yang macet dan menjalankan perbaikan terukur:
                membuka ulang test yang lewat durasi +5 menit saat kandidat sudah tidak aktif
                (jawaban tetap disimpan, maksimal 5 tindakan sekali jalan, satu test hanya
                dipulihkan sekali per 6 jam), serta melepas kunci perangkat kandidat yang lama
                tidak terlihat. Semua tindakan tercatat di Audit Log.
              </p>
              {lastRun && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Terakhir dijalankan {new Date(lastRun.at).toLocaleTimeString("id-ID")} ·{" "}
                  {lastRun.count} tindakan
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={autoRecover.isPending}
                onClick={() => autoRecover.mutate()}
              >
                <TimerReset className="mr-2 h-4 w-4" /> Jalankan sekarang
              </Button>
              <Switch id="auto-recovery" checked={autoOn} onCheckedChange={toggleAuto} />
            </div>
          </CardContent>
        </Card>
      )}


      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kandidat sedang online</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!online.length && (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Belum ada kandidat yang sedang membuka portal.
            </div>
          )}
          {online.map((c) => (
            <div
              key={c.code_id}
              className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm"
            >
              <PresenceBadge lastSeenAt={c.last_seen_at} />
              <span className="font-medium">{c.name}</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{c.code}</code>
              <Badge variant="outline" className="capitalize">
                {c.candidate_type}
              </Badge>
              {c.device_locked && (
                <Badge variant="secondary" className="gap-1">
                  <Smartphone className="h-3 w-3" /> Terkunci di 1 perangkat
                </Badge>
              )}
              {isAdmin && c.device_locked && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  disabled={resetDevice.isPending}
                  onClick={() => resetDevice.mutate(c.code_id)}
                >
                  Lepas kunci perangkat
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test yang sedang dikerjakan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!running.length && (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Tidak ada test yang sedang berjalan.
            </div>
          )}
          {running.map((r) => (
            <div
              key={r.attempt_id}
              className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm"
            >
              <Badge variant={r.overdue ? "destructive" : "secondary"}>
                {r.overdue ? "Macet" : "Berjalan"}
              </Badge>
              <span className="font-medium">{r.candidate_name}</span>
              <span className="text-muted-foreground">· {r.test_name}</span>
              <span className="text-xs text-muted-foreground">
                · {r.elapsed_minutes} menit
                {r.duration_minutes ? ` / ${r.duration_minutes} menit` : ""}
              </span>
              {r.overdue && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  disabled={resetAttempt.isPending}
                  onClick={() =>
                    resetAttempt.mutate({ candidate_id: r.candidate_id, test_id: r.test_id })
                  }
                >
                  <TimerReset className="mr-2 h-4 w-4" /> Perbaiki & buka ulang
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Insiden kandidat terbaru</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!incidents.length && (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Tidak ada insiden tercatat.
            </div>
          )}
          {incidents.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
              <Badge variant={i.resolved ? "secondary" : "destructive"}>
                {incidentLabel(i.source)}
              </Badge>
              <span className="text-sm">{i.message}</span>
              {i.actor_label && (
                <span className="text-xs text-muted-foreground">· {i.actor_label}</span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(i.occurred_at).toLocaleString("id-ID")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
