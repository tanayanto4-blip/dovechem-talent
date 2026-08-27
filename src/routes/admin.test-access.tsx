import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listCandidates, listRetakeRequests, decideRetakeRequest } from "@/lib/admin.functions";
import { TestAccessControl } from "@/components/test-access-control";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Search, ShieldCheck, Unlock, X } from "lucide-react";

export const Route = createFileRoute("/admin/test-access")({
  component: TestAccessPage,
  head: () => ({
    meta: [
      { title: "Kontrol Pengerjaan Test | Dover Chemical" },
      {
        name: "description",
        content: "Buka, tutup, dan setujui permintaan pengulangan test psikotest kandidat.",
      },
      { property: "og:title", content: "Kontrol Pengerjaan Test | Dover Chemical" },
      {
        property: "og:description",
        content: "Kelola akses buka/tutup test dan permintaan ulang test kandidat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function TestAccessPage() {
  const qc = useQueryClient();
  const candFn = useServerFn(listCandidates);
  const reqFn = useServerFn(listRetakeRequests);
  const decideFn = useServerFn(decideRetakeRequest);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: candData } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => candFn({ data: { limit: 1000 } }),
  });
  const { data: reqData } = useQuery({
    queryKey: ["retake-requests"],
    queryFn: () => reqFn({ data: { status: "pending" } }),
  });

  const candidates = (candData?.candidates ?? []) as any[];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return candidates.slice(0, 30);
    return candidates
      .filter((c) =>
        [c.full_name, c.code_snapshot, c.candidate_codes?.code, c.position_applied]
          .filter(Boolean)
          .some((v: string) => String(v).toLowerCase().includes(s)),
      )
      .slice(0, 30);
  }, [candidates, q]);

  const selectedCandidate = candidates.find((c) => c.id === selected);

  async function decide(id: string, approve: boolean) {
    setBusy(id);
    try {
      await decideFn({ data: { id, approve, clear_answers: true, note: null } });
      await qc.invalidateQueries({ queryKey: ["retake-requests"] });
      await qc.invalidateQueries({ queryKey: ["candidate-test-access"] });
      toast.success(approve ? "Permintaan disetujui, test dibuka kembali." : "Permintaan ditolak.");
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal memproses permintaan.");
    } finally {
      setBusy(null);
    }
  }

  const requests = (reqData?.requests ?? []) as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">Kontrol Pengerjaan Test</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Super Admin dan HR dapat langsung membuka/menutup akses test serta mengulang pengerjaan
          test kandidat tanpa menunggu persetujuan.
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Permintaan Ulang Test (menunggu)
            <Badge variant="secondary">{requests.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Tidak ada permintaan yang menunggu.
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {requests.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <div className="font-medium">
                      {r.candidates?.full_name ?? "Kandidat"} ·{" "}
                      <span className="text-secondary">{r.tests?.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("id-ID")}
                      {r.reason ? ` · Alasan: ${r.reason}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy === r.id} onClick={() => decide(r.id, true)}>
                      <Check className="mr-2 h-4 w-4" /> Setujui & Buka
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r.id}
                      onClick={() => decide(r.id, false)}
                    >
                      <X className="mr-2 h-4 w-4" /> Tolak
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-primary" /> Pilih Kandidat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama / kode kandidat..."
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c.id)}
                className={`rounded-md border p-3 text-left transition hover:border-primary ${
                  selected === c.id ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div className="text-sm font-medium">{c.full_name ?? "Tanpa nama"}</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {c.candidate_codes?.code ?? c.code_snapshot ?? "-"}
                </div>
              </button>
            ))}
            {filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground">Kandidat tidak ditemukan.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {selected ? (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Kandidat terpilih:{" "}
            <b className="text-foreground">{selectedCandidate?.full_name ?? "-"}</b>
          </div>
          <TestAccessControl candidateId={selected} />
        </div>
      ) : null}
    </div>
  );
}
