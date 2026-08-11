import { Button } from "@/components/ui/button";
import { GraduationCap, Briefcase, Layers } from "lucide-react";

export type Track = "magang" | "karyawan";

const OPTIONS: { value: Track; label: string; icon: typeof Layers }[] = [
  { value: "magang", label: "Magang", icon: GraduationCap },
  { value: "karyawan", label: "Karyawan", icon: Briefcase },
];

/** Pemisah bank data / bank soal antara jalur kandidat Magang dan Karyawan. */
export function TrackTabs({
  value,
  onChange,
  counts,
}: {
  value: Track;
  onChange: (t: Track) => void;
  counts?: Partial<Record<Track, number>>;
}) {
  return (
    <div className="inline-flex rounded-lg border bg-muted/40 p-1">
      {OPTIONS.map((o) => (
        <Button
          key={o.value}
          type="button"
          size="sm"
          variant={value === o.value ? "default" : "ghost"}
          className="gap-2"
          onClick={() => onChange(o.value)}
        >
          <o.icon className="h-4 w-4" />
          {o.label}
          {counts?.[o.value] != null && (
            <span className="rounded bg-background/30 px-1.5 text-[11px]">{counts[o.value]}</span>
          )}
        </Button>
      ))}
    </div>
  );
}

/** Jalur kandidat dari relasi kode akses (kode lama dianggap Karyawan). */
export function candidateTrack(c: any): Track {
  return c?.candidate_codes?.candidate_type === "magang" ? "magang" : "karyawan";
}
