import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { setTestAudience } from "@/lib/admin.functions";
import { useIsAdmin } from "@/components/publish-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { TEST_AUDIENCES, testAudienceLabel, type TestAudience } from "@/lib/candidate-type";

const KEYS = [["admin-tests"], ["admin-test"], ["candidate-tests"], ["candidate-profile"], ["test-intro"]];

/**
 * Super Admin menentukan test ini muncul di portal kandidat Magang, Karyawan,
 * atau keduanya. HR hanya melihat statusnya.
 */
export function TestAudienceEditor({
  testId,
  testName,
  value,
}: {
  testId: string;
  testName?: string;
  value?: string | null;
}) {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const save = useServerFn(setTestAudience);
  const current = (value ?? "both") as TestAudience;

  const mut = useMutation({
    mutationFn: (audience: TestAudience) => save({ data: { id: testId, audience } }),
    onSuccess: (_r, audience) => {
      toast.success(`${testName ?? "Test"} → ${testAudienceLabel(audience)}`);
      KEYS.forEach((queryKey) => qc.invalidateQueries({ queryKey, refetchType: "all" }));
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal mengubah jalur kandidat"),
  });

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Users className="h-3.5 w-3.5" /> Jalur kandidat
        <Badge variant="secondary">{testAudienceLabel(current)}</Badge>
      </div>
      {isAdmin ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TEST_AUDIENCES.map((a) => (
            <Button
              key={a}
              type="button"
              size="sm"
              variant={current === a ? "default" : "outline"}
              className="text-xs"
              disabled={mut.isPending}
              onClick={() => mut.mutate(a)}
            >
              {a === "both"
                ? "Keduanya"
                : a === "magang"
                  ? "Magang"
                  : a === "karyawan"
                    ? "Semua Karyawan"
                    : a === "karyawan_staff"
                      ? "Staff"
                      : "SPV ke atas"}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">Hanya Super Admin yang dapat mengubah jalur kandidat.</p>
      )}
    </div>
  );
}
