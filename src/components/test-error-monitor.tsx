import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { testErrorMonitor, resolveErrorsBulk, resolveErrorEvent } from "@/lib/monitoring.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, RefreshCw, Bug, FlaskConical } from "lucide-react";

const INCIDENT_LABEL: Record<string, string> = {
  "koneksi-terputus": "Sinyal kandidat terputus",
  "koneksi-pulih": "Sinyal kandidat pulih",
  "autosave-gagal": "Jawaban gagal tersimpan",
  "logout-perangkat-lain": "Terlogout (kode dipakai perangkat lain)",
  "sesi-tidak-valid": "Sesi kandidat ditolak",
  "test-auto-submit": "Test terkirim otomatis (waktu habis)",
  "kirim-jawaban-gagal": "Gagal kirim jawaban",
};

function label(source: string) {
  if (source.startsWith("insiden:")) {
    const kind = source.slice("insiden:".length);
    return INCIDENT_LABEL[kind] ?? `Insiden: ${kind}`;
  }
  return source;
}

/** Monitor error yang terjadi saat kandidat mengerjakan test, dikelompokkan per test. */
export function TestErrorMonitor({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const listFn = useServerFn(testErrorMonitor);
  const bulkFn = useServerFn(resolveErrorsBulk);
  const oneFn = useServerFn(resolveErrorEvent);
  const [onlyOpen, setOnlyOpen] = useState(true);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["test-error-monitor", onlyOpen],
    queryFn: () => listFn({ data: { onlyOpen, limit: 300 } }),
    refetchInterval: 20_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["test-error-monitor"] });
    qc.invalidateQueries({ queryKey: ["error-events"] });
    qc.invalidateQueries({ queryKey: ["error-open-count"] });
  };

  const bulk = useMutation({
    mutationFn: (ids: string[]) => bulkFn({ data: { ids, resolved: true } }),
    onSuccess: (r) => {
      toast.success(`${r.count} error ditandai sudah ditangani`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const one = useMutation({
    mutationFn: (v: { id: string; resolved: boolean }) => oneFn({ data: v }),
    onSuccess: () => {
      toast.success("Status error diperbarui");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const groups = data?.groups ?? [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Error test belum ditangani
            </div>
            <div className="font-display text-3xl font-bold text-destructive">
              {data?.totalOpen ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Test terdampak
            </div>
            <div className="font-display text-3xl font-bold text-primary">{groups.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <div className="flex items-center gap-2">
              <Switch id="test-only-open" checked={onlyOpen} onCheckedChange={setOnlyOpen} />
              <Label htmlFor="test-only-open" className="text-sm">
                Hanya yang belum ditangani
              </Label>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Muat ulang
            </Button>
          </CardContent>
        </Card>
      </div>

      {!groups.length && (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Tidak ada error pada pengerjaan test. Semua test berjalan normal.
        </div>
      )}

      {groups.map((g) => (
        <Card key={g.key}>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <Bug className="h-4 w-4 text-destructive" />
              {g.test_name}
              <Badge variant={g.open ? "destructive" : "secondary"}>{g.open} terbuka</Badge>
              <Badge variant="outline">{g.total} kejadian</Badge>
              {g.last_at && (
                <span className="text-xs font-normal text-muted-foreground">
                  terakhir {new Date(g.last_at).toLocaleString("id-ID")}
                </span>
              )}
              {isAdmin && !!g.open && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  disabled={bulk.isPending}
                  onClick={() => bulk.mutate(g.items.filter((i) => !i.resolved).map((i) => i.id))}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Tandai semua ditangani
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {g.items.map((i) => (
              <div key={i.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={i.resolved ? "secondary" : "destructive"}>
                    {i.resolved ? "Ditangani" : "Terbuka"}
                  </Badge>
                  <Badge variant="outline">{label(i.source)}</Badge>
                  {i.practice && (
                    <Badge variant="secondary" className="gap-1">
                      <FlaskConical className="h-3 w-3" /> Halaman latihan
                    </Badge>
                  )}
                  {i.actor_label && (
                    <span className="text-xs text-muted-foreground">· {i.actor_label}</span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(i.occurred_at).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="mt-2 flex items-start gap-2 text-sm font-medium">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  {i.message}
                </div>
                {i.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      Detail teknis
                    </summary>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-[11px]">
                      {i.stack}
                    </pre>
                  </details>
                )}
                {isAdmin && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant={i.resolved ? "outline" : "default"}
                      disabled={one.isPending}
                      onClick={() => one.mutate({ id: i.id, resolved: !i.resolved })}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {i.resolved ? "Buka kembali" : "Tandai sudah ditangani"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
