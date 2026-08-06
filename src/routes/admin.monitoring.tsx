import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  listErrorEvents,
  resolveErrorEvent,
  clearResolvedErrors,
} from "@/lib/monitoring.functions";
import { getMyRoles } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, RefreshCw, Trash2, Download } from "lucide-react";

export const Route = createFileRoute("/admin/monitoring")({
  head: () => ({
    meta: [
      { title: "Monitor Error — Admin PT Dover Chemical" },
      {
        name: "description",
        content:
          "Pantau kegagalan yang terjadi di halaman Admin, HR, dan Kandidat secara real-time beserta status penanganannya.",
      },
    ],
  }),
  component: MonitoringPage,
});

const AREA_LABEL: Record<string, string> = {
  admin: "Admin/HR",
  hr: "HR",
  candidate: "Kandidat",
  public: "Halaman Publik",
};

type Row = {
  id: string;
  occurred_at: string;
  area: string;
  route: string | null;
  source: string;
  message: string;
  stack: string | null;
  actor_label: string | null;
  resolved: boolean;
  resolution_note: string | null;
};

function MonitoringPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listErrorEvents);
  const resolveFn = useServerFn(resolveErrorEvent);
  const clearFn = useServerFn(clearResolvedErrors);
  const rolesFn = useServerFn(getMyRoles);

  const [onlyOpen, setOnlyOpen] = useState(true);
  const [area, setArea] = useState<string>("all");

  const { data: roles } = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn({ data: {} as never }) });
  const isAdmin = !!roles?.roles?.includes("admin");

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["error-events", onlyOpen, area],
    queryFn: () =>
      listFn({
        data: {
          onlyOpen,
          ...(area !== "all" ? { area: area as "admin" | "hr" | "candidate" | "public" } : {}),
          limit: 200,
        },
      }),
    refetchInterval: 30_000,
  });

  const rows = (data?.rows ?? []) as Row[];

  const resolveM = useMutation({
    mutationFn: (v: { id: string; resolved: boolean }) => resolveFn({ data: v }),
    onSuccess: () => {
      toast.success("Status error diperbarui");
      qc.invalidateQueries({ queryKey: ["error-events"] });
      qc.invalidateQueries({ queryKey: ["error-open-count"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearM = useMutation({
    mutationFn: () => clearFn({ data: {} as never }),
    onSuccess: () => {
      toast.success("Error yang sudah ditangani dihapus");
      qc.invalidateQueries({ queryKey: ["error-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function exportCsv() {
    const head = ["Waktu", "Area", "Halaman", "Sumber", "Pengguna", "Pesan", "Status"];
    const body = rows.map((r) => [
      new Date(r.occurred_at).toLocaleString("id-ID"),
      AREA_LABEL[r.area] ?? r.area,
      r.route ?? "",
      r.source,
      r.actor_label ?? "",
      r.message,
      r.resolved ? "Ditangani" : "Terbuka",
    ]);
    const csv = [head, ...body]
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `monitor-error-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary">Monitor Error</h1>
          <p className="text-sm text-muted-foreground">
            Setiap kegagalan di halaman Admin, HR, dan Kandidat tercatat otomatis di sini.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Muat ulang
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <Download className="mr-2 h-4 w-4" /> Ekspor CSV
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => clearM.mutate()}
              disabled={clearM.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Hapus yang ditangani
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Belum ditangani</div>
            <div className="text-3xl font-bold text-destructive">{data?.openCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Tampil sekarang</div>
            <div className="text-3xl font-bold text-primary">{rows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col justify-center gap-3 p-4">
            <div className="flex items-center gap-2">
              <Switch id="only-open" checked={onlyOpen} onCheckedChange={setOnlyOpen} />
              <Label htmlFor="only-open" className="text-sm">Hanya yang belum ditangani</Label>
            </div>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua area</SelectItem>
                <SelectItem value="admin">Admin/HR</SelectItem>
                <SelectItem value="candidate">Kandidat</SelectItem>
                <SelectItem value="public">Halaman Publik</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Daftar Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!rows.length && (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              Tidak ada error tercatat. Semua halaman berjalan normal.
            </div>
          )}
          {rows.map((r) => (
            <div key={r.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={r.resolved ? "secondary" : "destructive"}>
                  {r.resolved ? "Ditangani" : "Terbuka"}
                </Badge>
                <Badge variant="outline">{AREA_LABEL[r.area] ?? r.area}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.occurred_at).toLocaleString("id-ID")}
                </span>
                <span className="text-xs text-muted-foreground">· {r.route}</span>
                {r.actor_label && (
                  <span className="text-xs text-muted-foreground">· {r.actor_label}</span>
                )}
                <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                  {r.source}
                </span>
              </div>
              <div className="mt-2 text-sm font-medium">{r.message}</div>
              {r.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    Detail teknis
                  </summary>
                  <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-[11px]">
                    {r.stack}
                  </pre>
                </details>
              )}
              {isAdmin && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant={r.resolved ? "outline" : "default"}
                    onClick={() => resolveM.mutate({ id: r.id, resolved: !r.resolved })}
                    disabled={resolveM.isPending}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {r.resolved ? "Buka kembali" : "Tandai sudah ditangani"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
