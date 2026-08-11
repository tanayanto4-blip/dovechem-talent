import { GraduationCap, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidateType } from "@/lib/candidate-type";

/**
 * Pemisah jalur kandidat (Magang / Karyawan) untuk Bank Soal & Bank Data.
 * Dipakai Super Admin dan HR agar data kedua jalur tidak tercampur.
 */
export function TrackTabs({
  value,
  onChange,
  counts,
  className,
}: {
  value: CandidateType;
  onChange: (v: CandidateType) => void;
  counts?: Partial<Record<CandidateType, number>>;
  className?: string;
}) {
  const items: Array<{ key: CandidateType; label: string; Icon: typeof Briefcase }> = [
    { key: "magang", label: "Magang", Icon: GraduationCap },
    { key: "karyawan", label: "Karyawan", Icon: Briefcase },
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
            "inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            value === key
              ? "bg-card text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
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
