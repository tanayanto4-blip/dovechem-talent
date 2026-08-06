import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { setTestDuration } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Timer, Check } from "lucide-react";

const PRESETS = [5, 10, 12, 15, 20, 30, 45, 60, 90];

/** Editor durasi (menit) satu psikotest — dipakai Super Admin & HR. */
export function TestDurationEditor({
  testId,
  testName,
  value,
  compact,
}: {
  testId: string;
  testName?: string;
  value: number;
  compact?: boolean;
}) {
  const [minutes, setMinutes] = useState(String(value ?? 30));
  const qc = useQueryClient();
  const save = useServerFn(setTestDuration);

  useEffect(() => setMinutes(String(value ?? 30)), [value]);

  const mut = useMutation({
    mutationFn: (n: number) => save({ data: { test_id: testId, duration_minutes: n } }),
    onSuccess: (_res, n) => {
      toast.success(`Waktu ${testName ?? "test"} diatur ${n} menit`);
      for (const key of [
        ["admin-tests"],
        ["admin-test"],
        ["voice-instructions"],
        ["candidate-tests"],
        ["candidate-profile"],
        ["test-intro"],
        ["start-test"],
        ["admin-stats"],
      ]) {
        qc.invalidateQueries({ queryKey: key, refetchType: "all" });
      }

    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal menyimpan durasi"),
  });

  const parsed = Number(minutes);
  const invalid = !Number.isInteger(parsed) || parsed < 1 || parsed > 600;
  const dirty = parsed !== value;

  return (
    <div className={compact ? "space-y-2" : "space-y-3 rounded-lg border bg-muted/30 p-3"}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Timer className="h-3.5 w-3.5" /> Waktu pengerjaan (menit)
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          max={600}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="h-9 w-24"
          aria-label={`Durasi ${testName ?? "test"} dalam menit`}
        />
        <Button
          size="sm"
          className="gap-1"
          disabled={invalid || !dirty || mut.isPending}
          onClick={() => mut.mutate(parsed)}
        >
          <Check className="h-3.5 w-3.5" /> {mut.isPending ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setMinutes(String(p))}
            className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
              parsed === p ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {p}m
          </button>
        ))}
      </div>
      {invalid && <p className="text-[11px] text-destructive">Durasi harus 1–600 menit.</p>}
    </div>
  );
}
