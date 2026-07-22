import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAuditLogs } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ShieldCheck } from "lucide-react";

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

function AuditPage() {
  const fetchLogs = useServerFn(listAuditLogs);
  const [filter, setFilter] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["audit-logs", filter],
    queryFn: () => fetchLogs({ data: { limit: 200, action: filter } }),
  });
  const rows: Row[] = (q.data?.logs ?? []) as Row[];

  const filters: Array<{ key: string | null; label: string }> = [
    { key: null, label: "Semua" },
    { key: "admin.access", label: "Akses Admin" },
    { key: "code.activate", label: "Aktivasi" },
    { key: "code.deactivate", label: "Nonaktif" },
    { key: "code.activate_bulk", label: "Aktivasi Bulk" },
    { key: "code.deactivate_bulk", label: "Nonaktif Bulk" },
    { key: "attempt.view", label: "Lihat Jawaban" },
    { key: "attempt.submit", label: "Submit Tes" },
  ];

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
        <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.label}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {q.isLoading ? "Memuat…" : `${rows.length} catatan terbaru`}
          </CardTitle>
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
                          {r.actor?.full_name || r.actor?.username || "—"}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {r.actor_id.slice(0, 8)}…
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
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {r.target_id.slice(0, 8)}…
                          </div>
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
