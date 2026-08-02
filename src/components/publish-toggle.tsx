import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getMyRoles,
  setTestActive,
  setQuestionsPublished,
  setAllQuestionsPublished,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff } from "lucide-react";

const KEYS = [["admin-tests"], ["admin-test"], ["mbti-questions"], ["candidate-tests"], ["admin-stats"]];

function useInvalidate() {
  const qc = useQueryClient();
  return () => KEYS.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
}

/** True bila user saat ini Super Admin (hanya Super Admin boleh publish/unpublish). */
export function useIsAdmin() {
  const fn = useServerFn(getMyRoles);
  const { data } = useQuery({ queryKey: ["my-roles"], queryFn: () => fn({ data: {} as never }) });
  return !!(data as any)?.roles?.includes("admin");
}

/** Toggle publish/draft untuk satu test di Bank Soal. */
export function TestPublishToggle({
  testId,
  testName,
  active,
}: {
  testId: string;
  testName?: string;
  active: boolean;
}) {
  const isAdmin = useIsAdmin();
  const invalidate = useInvalidate();
  const save = useServerFn(setTestActive);

  const mut = useMutation({
    mutationFn: (next: boolean) => save({ data: { id: testId, active: next } }),
    onSuccess: (_r, next) => {
      toast.success(`${testName ?? "Test"} ${next ? "dipublish" : "diubah ke draft"}`);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal mengubah status publish"),
  });

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        Status bank soal
        <Badge variant={active ? "default" : "secondary"}>{active ? "Published" : "Draft"}</Badge>
      </div>
      <Switch
        checked={active}
        disabled={!isAdmin || mut.isPending}
        onCheckedChange={(v) => mut.mutate(v)}
        aria-label={`Publish ${testName ?? "test"}`}
      />
    </div>
  );
}

/** Toggle publish untuk satu soal. */
export function QuestionPublishToggle({ id, active }: { id: string; active: boolean }) {
  const isAdmin = useIsAdmin();
  const invalidate = useInvalidate();
  const save = useServerFn(setQuestionsPublished);

  const mut = useMutation({
    mutationFn: (next: boolean) => save({ data: { ids: [id], active: next } }),
    onSuccess: (_r, next) => {
      toast.success(next ? "Soal dipublish" : "Soal disembunyikan (draft)");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal mengubah status soal"),
  });

  return (
    <div className="flex items-center gap-2">
      <Badge variant={active ? "default" : "secondary"} className="text-[10px]">
        {active ? "Published" : "Draft"}
      </Badge>
      <Switch
        checked={active}
        disabled={!isAdmin || mut.isPending}
        onCheckedChange={(v) => mut.mutate(v)}
        aria-label="Publish soal"
      />
    </div>
  );
}

/** Publish/unpublish semua soal pada satu test. */
export function BulkQuestionPublish({ testId }: { testId: string }) {
  const isAdmin = useIsAdmin();
  const invalidate = useInvalidate();
  const save = useServerFn(setAllQuestionsPublished);

  const mut = useMutation({
    mutationFn: (next: boolean) => save({ data: { test_id: testId, active: next } }),
    onSuccess: (res: any, next) => {
      toast.success(`${res?.updated ?? 0} soal ${next ? "dipublish" : "diubah ke draft"}`);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal mengubah status soal"),
  });

  if (!isAdmin) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={mut.isPending} onClick={() => mut.mutate(true)}>
        <Eye className="mr-2 h-4 w-4" /> Publish semua soal
      </Button>
      <Button size="sm" variant="outline" disabled={mut.isPending} onClick={() => mut.mutate(false)}>
        <EyeOff className="mr-2 h-4 w-4" /> Draft-kan semua soal
      </Button>
    </div>
  );
}
