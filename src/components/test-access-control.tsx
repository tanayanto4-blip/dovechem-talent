import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listCandidateTestAccess,
  setCandidateTestAccess,
  setAllCandidateTestAccess,
  reopenCandidateTest,
  requestCandidateRetake,
} from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Lock, LockOpen, RotateCcw, ShieldCheck } from "lucide-react";

/**
 * Staff view of every test for one candidate with Super-Admin controls to
 * open/close access and to ask the candidate to redo a test.
 */
export function TestAccessControl({ candidateId }: { candidateId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listCandidateTestAccess);
  const setFn = useServerFn(setCandidateTestAccess);
  const setAllFn = useServerFn(setAllCandidateTestAccess);
  const reopenFn = useServerFn(reopenCandidateTest);
  const requestFn = useServerFn(requestCandidateRetake);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["candidate-test-access", candidateId],
    queryFn: () => listFn({ data: { candidate_id: candidateId } }),
  });

  // Super Admin & HR sama-sama boleh membuka/menutup dan mengulang test.
  const isAdmin = true;
  const attempts = new Map((data?.attempts ?? []).map((a: any) => [a.test_id, a]));
  const access = new Map((data?.access ?? []).map((a: any) => [a.test_id, a]));

  async function run(key: string, fn: () => Promise<unknown>, okMsg: string) {
    setBusy(key);
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["candidate-test-access", candidateId] });
      toast.success(okMsg);
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal memproses permintaan.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Kontrol Pengerjaan Test
          </span>
          {isAdmin ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy === "all-open"}
                onClick={() =>
                  run(
                    "all-open",
                    () =>
                      setAllFn({
                        data: { candidate_id: candidateId, is_open: true, reason: reason || null },
                      }),
                    "Semua test dibuka.",
                  )
                }
              >
                <LockOpen className="mr-2 h-4 w-4" /> Buka semua
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === "all-close"}
                onClick={() =>
                  run(
                    "all-close",
                    () =>
                      setAllFn({
                        data: { candidate_id: candidateId, is_open: false, reason: reason || null },
                      }),
                    "Semua test ditutup.",
                  )
                }
              >
                <Lock className="mr-2 h-4 w-4" /> Tutup semua
              </Button>
            </div>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin ? (
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Alasan (opsional) — mis. 'Ulangi karena koneksi terputus'"
            maxLength={300}
          />
        ) : (
          <div className="space-y-2">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Alasan permintaan (opsional) — mis. 'Koneksi kandidat terputus'"
              maxLength={300}
            />
            <p className="text-sm text-muted-foreground">
              Anda dapat <b>mengajukan permintaan ulang test</b>. Persetujuan buka/tutup akses
              dilakukan oleh Super Admin.
            </p>
          </div>
        )}

        <div className="divide-y rounded-md border">
          {(data?.tests ?? []).map((t: any) => {
            const at = attempts.get(t.id) as any;
            const ac = access.get(t.id) as any;
            const closed = ac?.is_open === false;
            const done = at?.status === "finished";
            return (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-[220px]">
                  <div className="font-medium">{t.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono uppercase">{t.code}</span>
                    {done ? (
                      <Badge className="bg-success">Selesai</Badge>
                    ) : at ? (
                      <Badge variant="secondary">Sedang dikerjakan</Badge>
                    ) : (
                      <Badge variant="outline">Belum mulai</Badge>
                    )}
                    {closed ? (
                      <Badge variant="destructive">Ditutup</Badge>
                    ) : (
                      <Badge variant="outline">Terbuka</Badge>
                    )}
                    {ac?.retake_count ? <span>Diulang {ac.retake_count}x</span> : null}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={!closed}
                      disabled={!isAdmin || busy === `acc-${t.id}`}
                      onCheckedChange={(v) =>
                        run(
                          `acc-${t.id}`,
                          () =>
                            setFn({
                              data: {
                                candidate_id: candidateId,
                                test_id: t.id,
                                is_open: v,
                                reason: reason || null,
                              },
                            }),
                          v ? `${t.name} dibuka.` : `${t.name} ditutup.`,
                        )
                      }
                    />
                    {closed ? "Tutup" : "Buka"}
                  </label>
                  {isAdmin ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy === `re-${t.id}`}
                      onClick={() => {
                        if (
                          !confirm(
                            `Minta kandidat mengulangi ${t.name}? Jawaban sebelumnya akan dihapus.`,
                          )
                        )
                          return;
                        run(
                          `re-${t.id}`,
                          () =>
                            reopenFn({
                              data: {
                                candidate_id: candidateId,
                                test_id: t.id,
                                clear_answers: true,
                                reason: reason || null,
                              },
                            }),
                          `${t.name} dibuka untuk pengerjaan ulang.`,
                        );
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" /> Ulangi
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === `req-${t.id}`}
                      onClick={() =>
                        run(
                          `req-${t.id}`,
                          () =>
                            requestFn({
                              data: {
                                candidate_id: candidateId,
                                test_id: t.id,
                                reason: reason || null,
                              },
                            }),
                          `Permintaan ulang ${t.name} dikirim ke Super Admin.`,
                        )
                      }
                    >
                      <RotateCcw className="mr-2 h-4 w-4" /> Minta Ulangi
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
