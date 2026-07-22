import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listAuditLogs } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Download, RefreshCw, ShieldCheck, X } from "lucide-react";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — Admin PT Dover Chemical" },
      { name: "description", content: "Jejak aktivitas admin/HR: aktivasi kode kandidat dan akses lembar jawaban." },
    ],
  }),
  component: AuditPage,
});

type Row = {
  id: string;
  actor_id: string | null;
  actor_type: "staff" | "candidate" | "system" | string;
  actor_label: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string | null; username: string | null } | null;
};

const ACTION_LABEL: Record<string, string> = {
  "code.activate": "Aktivasi kode",
  "code.deactivate": "Nonaktifkan kode",
  "code.activate_bulk": "Aktivasi kode (bulk)",
  "code.deactivate_bulk": "Nonaktifkan kode (bulk)",
  "attempt.view": "Lihat lembar jawaban",
  "attempt.submit": "Kandidat submit tes",
  "admin.access": "Akses dashboard admin",
};

const PAGE_SIZE = 50;
const EXPORT_LIMIT = 500;

function toCsv(rows: Row[]): string {
  const headers = ["waktu", "actor_type", "actor_name", "actor_id", "action", "action_label", "target_type", "target_id", "metadata"];
  const esc = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      new Date(r.created_at).toISOString(),
      r.actor_type,
      r.actor?.full_name || r.actor?.username || r.actor_label || "",
      r.actor_id ?? "",
      r.action,
      ACTION_LABEL[r.action] ?? r.action,
      r.target_type,
      r.target_id ?? "",
      r.metadata ?? {},
    ].map(esc).join(","));
  }
  return lines.join("\n");
}

function downloadCsv(rows: Row[]) {
  const csv = toCsv(rows);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  a.href = url;
  a.download = `audit-log-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Local datetime <input type="datetime-local"> value -> ISO string (or null).
function localToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function AuditPage() {
  const fetchLogs = useServerFn(listAuditLogs);
  const [action, setAction] = useState<string | null>(null);
  const [targetId, setTargetId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);

  const queryArgs = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      action,
      target_id: targetId.trim() || null,
      from: localToIso(from),
      to: localToIso(to),
    }),
    [action, targetId, from, to, page],
  );

  const q = useQuery({
    queryKey: ["audit-logs", queryArgs],
    queryFn: () => fetchLogs({ data: queryArgs }),
  });
  const rows: Row[] = (q.data?.logs ?? []) as Row[];
  const total = q.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const end = Math.min(total, page * PAGE_SIZE + rows.length);

  const resetPage = () => setPage(0);
  const clearAll = () => {
    setAction(null);
    setTargetId("");
    setFrom("");
    setTo("");
    setPage(0);
  };

  const actionFilters: Array<{ key: string | null; label: string }> = [
    { key: null, label: "Semua" },
    { key: "admin.access", label: "Akses Admin" },
    { key: "code.activate", label: "Aktivasi" },
    { key: "code.deactivate", label: "Nonaktif" },
    { key: "code.activate_bulk", label: "Aktivasi Bulk" },
    { key: "code.deactivate_bulk", label: "Nonaktif Bulk" },
    { key: "attempt.view", label: "Lihat Jawaban" },
    { key: "attempt.submit", label: "Submit Tes" },
  ];

  async function exportAllMatching() {
    const res = await fetchLogs({
      data: {
        ...queryArgs,
        limit: EXPORT_LIMIT,
        offset: 0,
      },
    });
    downloadCsv((res?.logs ?? []) as Row[]);
  }

  const hasActiveFilter = action !== null || targetId.trim() !== "" || from !== "" || to !== "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <ShieldCheck className="h-5 w-5 text-primary" /> Audit Log
          </h1>
          <p className="text-sm text-muted-foreground">
            Catatan aktivitas admin/HR untuk keperluan security review.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadCsv(rows)} disabled={rows.length === 0}>
            <Download className="mr-2 h-4 w-4" /> CSV halaman
          </Button>
          <Button variant="outline" size="sm" onClick={exportAllMatching} disabled={total === 0}>
            <Download className="mr-2 h-4 w-4" /> CSV semua (maks {EXPORT_LIMIT})
          </Button>
          <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap gap-2">
            {actionFilters.map((f) => (
              <Button
                key={f.label}
                size="sm"
                variant={action === f.key ? "default" : "outline"}
                onClick={() => {
                  setAction(f.key);
                  resetPage();
                }}
              >
                {f.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="audit-target">Target ID (kandidat / kode / attempt)</Label>
              <Input
                id="audit-target"
                placeholder="Cocokkan sebagian UUID…"
                value={targetId}
                onChange={(e) => {
                  setTargetId(e.target.value);
                  resetPage();
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="audit-from">Dari</Label>
              <Input
                id="audit-from"
                type="datetime-local"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  resetPage();
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="audit-to">Sampai</Label>
              <Input
                id="audit-to"
                type="datetime-local"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  resetPage();
                }}
              />
            </div>
          </div>

          {hasActiveFilter ? (
            <div>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                <X className="mr-2 h-4 w-4" /> Reset filter
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">
            {q.isLoading
              ? "Memuat…"
              : total === 0
                ? "Tidak ada catatan"
                : `Menampilkan ${start}–${end} dari ${total}`}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || q.isFetching}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
              disabled={page + 1 >= totalPages || q.isFetching}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Waktu</th>
                  <th className="px-4 py-2">Aktor</th>
                  <th className="px-4 py-2">Aksi</th>
                  <th className="px-4 py-2">Objek</th>
                  <th className="px-4 py-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !q.isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Belum ada catatan.
                    </td>
                  </tr>
                ) : null}
                {rows.map((r) => {
                  const meta = r.metadata ?? {};
                  const details: string[] = [];
                  for (const [k, v] of Object.entries(meta)) {
                    if (v == null || v === "") continue;
                    details.push(`${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
                  }
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">
                        {new Date(r.created_at).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-medium">
                          {r.actor_type === "candidate"
                            ? (r.actor_label || "Kandidat")
                            : (r.actor?.full_name || r.actor?.username || r.actor_label || "—")}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {r.actor_type === "candidate"
                            ? "kandidat"
                            : r.actor_id
                              ? `${r.actor_id.slice(0, 8)}…`
                              : r.actor_type}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={r.action.startsWith("code.deactivate") ? "destructive" : "secondary"}>
                          {ACTION_LABEL[r.action] ?? r.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-xs">{r.target_type}</div>
                        {r.target_id ? (
                          <button
                            type="button"
                            className="font-mono text-[10px] text-muted-foreground underline-offset-2 hover:underline"
                            onClick={() => {
                              setTargetId(r.target_id!);
                              resetPage();
                            }}
                            title="Filter berdasarkan target ini"
                          >
                            {r.target_id.slice(0, 8)}…
                          </button>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {details.length ? details.join(" · ") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
