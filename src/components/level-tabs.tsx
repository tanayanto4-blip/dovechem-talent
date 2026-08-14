import { Layers, UserCog, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobLevel } from "@/lib/candidate-type";

export type LevelFilter = "all" | JobLevel;

/**
 * Sub-filter tingkat jabatan untuk jalur Karyawan (Staff / SPV ke atas).
 * Dipakai Super Admin dan HR di Bank Soal dan Data Kandidat.
 */
export function LevelTabs({
  value,
  onChange,
  counts,
  className,
}: {
  value: LevelFilter;
  onChange: (v: LevelFilter) => void;
  counts?: Partial<Record<LevelFilter, number>>;
  className?: string;
}) {
  const items: Array<{ key: LevelFilter; label: string; Icon: typeof Users }> = [
    { key: "all", label: "Semua", Icon: Layers },
    { key: "staff", label: "Staff", Icon: Users },
    { key: "spv_up", label: "SPV ke atas", Icon: UserCog },
  ];
  return (
    <div className={cn("inline-flex rounded-lg border bg-muted/40 p-1", className)} role="tablist">
      {items.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === key ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
          {counts?.[key] != null && (
            <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums">{counts[key]}</span>
          )}
        </button>
      ))}
    </div>
  );
}
