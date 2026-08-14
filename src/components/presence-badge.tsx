import { Badge } from "@/components/ui/badge";

/** Kandidat dianggap online jika heartbeat (tiap 5 detik) terlihat < 30 detik lalu. */
export const ONLINE_WINDOW_MS = 30_000;

export function isCandidateOnline(lastSeenAt?: string | null): boolean {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  return Number.isFinite(t) && Date.now() - t < ONLINE_WINDOW_MS;
}

function relative(lastSeenAt?: string | null): string {
  if (!lastSeenAt) return "belum pernah login";
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  if (!Number.isFinite(diff)) return "belum pernah login";
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "beberapa detik lalu";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return new Date(lastSeenAt).toLocaleString("id-ID");
}

/** Indikator Online/Offline kandidat berdasarkan heartbeat portal. */
export function PresenceBadge({ lastSeenAt }: { lastSeenAt?: string | null }) {
  const online = isCandidateOnline(lastSeenAt);
  return (
    <Badge
      variant={online ? "default" : "outline"}
      className={
        online ? "gap-1.5 bg-success text-success-foreground" : "gap-1.5 text-muted-foreground"
      }
      title={online ? "Kandidat sedang membuka portal" : `Terakhir aktif: ${relative(lastSeenAt)}`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${online ? "animate-pulse bg-current" : "bg-muted-foreground/60"}`}
        aria-hidden
      />
      {online ? "Online" : "Offline"}
    </Badge>
  );
}
