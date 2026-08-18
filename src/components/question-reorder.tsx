import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { renumberTestQuestions } from "@/lib/admin.functions";
import { useIsStaff } from "@/components/publish-toggle";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";

const KEYS = [["admin-test"], ["admin-tests"], ["candidate-tests"], ["start-test"]];

/** Geser tata letak urutan soal ke atas / ke bawah (Super Admin & HR). */
export function QuestionReorderButtons({
  testId,
  orderedIds,
  index,
}: {
  testId: string;
  orderedIds: string[];
  index: number;
}) {
  const isStaff = useIsStaff();
  const qc = useQueryClient();
  const save = useServerFn(renumberTestQuestions);

  const mut = useMutation({
    mutationFn: (dir: -1 | 1) => {
      const next = [...orderedIds];
      const target = index + dir;
      const a = next[index];
      const b = next[target];
      if (!a || !b) throw new Error("Urutan tidak bisa digeser lagi.");
      next[index] = b;
      next[target] = a;
      return save({ data: { test_id: testId, ordered_ids: next } });
    },
    onSuccess: async () => {
      toast.success("Urutan soal diperbarui.");
      await Promise.all(
        KEYS.map((queryKey) => qc.invalidateQueries({ queryKey, refetchType: "all" })),
      );
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal mengubah urutan."),
  });

  if (!isStaff) return null;

  return (
    <div className="flex items-center">
      <Button
        size="icon"
        variant="ghost"
        aria-label="Pindah soal ke atas"
        disabled={index === 0 || mut.isPending}
        onClick={() => mut.mutate(-1)}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Pindah soal ke bawah"
        disabled={index >= orderedIds.length - 1 || mut.isPending}
        onClick={() => mut.mutate(1)}
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
