import { createFileRoute, Link, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { candidateGetProfile, candidateSessionStatus } from "@/lib/candidate.functions";
import { toast } from "sonner";
import { useCandidateSession, setCandidateSession, DEVICE_CONFLICT_MESSAGE } from "@/lib/candidate-session";
import { candidateTypeLabel } from "@/lib/candidate-type";
import { reportIncident } from "@/lib/error-monitor";
import { Button } from "@/components/ui/button";
import { Beaker, LogOut, User, ClipboardList, Home } from "lucide-react";
import doverLogo from "@/assets/dover-logo.jpg.asset.json";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

export const Route = createFileRoute("/candidate/portal")({
  head: () => ({ meta: [
    { title: "Portal Kandidat — PT Dover Chemical" },
    { name: "description", content: "Portal kandidat PT Dover Chemical: lengkapi data diri, dengarkan instruksi, lalu kerjakan rangkaian psikotest online sesuai jadwal HR." },
    { property: "og:title", content: "Portal Kandidat — PT Dover Chemical" },
    { property: "og:description", content: "Portal kandidat PT Dover Chemical: lengkapi data diri, dengarkan instruksi, lalu kerjakan rangkaian psikotest online sesuai jadwal HR." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: PortalLayout,
});

function PortalLayout() {
  const nav = useNavigate();
  const session = useCandidateSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (hydrated && session === null && typeof window !== "undefined") {
      nav({ to: "/candidate/login" });
    }
  }, [hydrated, session, nav]);

  const getProfile = useServerFn(candidateGetProfile);
  // One shared session check: children reuse this cache entry, so an invalid /
  // expired code shows one clear message instead of an error on every page.
  const { data: profile, error: sessionError } = useQuery({
    queryKey: ["candidate-profile", session?.code],
    queryFn: () => getProfile({ data: { code: session!.code, device: session!.device } }),
    enabled: !!session,
    retry: false,
  });

  // One code = one device. Deteksi real-time via SSE (push dari server, ~1-2
  // detik) dengan fallback polling kalau koneksi stream terputus/diblokir.
  const sessionStatus = useServerFn(candidateSessionStatus);
  const [streamConflict, setStreamConflict] = useState(false);
  const { data: status } = useQuery({
    queryKey: ["candidate-session-status", session?.code, session?.device],
    queryFn: () => sessionStatus({ data: { code: session!.code, device: session!.device } }),
    enabled: !!session,
    retry: false,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (!session?.code || typeof window === "undefined" || !("EventSource" in window)) return;
    const url = `/api/public/candidate-session-stream?code=${encodeURIComponent(session.code)}&device=${encodeURIComponent(session.device ?? "")}`;
    const es = new EventSource(url);
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data) as { status?: string };
        if (payload.status === "conflict") {
          setStreamConflict(true);
          es.close();
        }
      } catch { /* ignore malformed frame */ }
    };
    return () => es.close();
  }, [session?.code, session?.device]);

  const takenOver = streamConflict || status?.status === "conflict";
  useEffect(() => {
    if (!takenOver) return;
    toast.error(DEVICE_CONFLICT_MESSAGE);
    reportIncident("logout-perangkat-lain", "Kandidat keluar otomatis: kode dipakai di perangkat lain", {
      code: session?.code,
      candidate: session?.candidate_name,
    });
    setCandidateSession(null);
    nav({ to: "/candidate/login" });
  }, [takenOver, nav, session?.code, session?.candidate_name]);

  // Sinyal kandidat putus/pulih -> tercatat di Monitor Error untuk tim HC.
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const goOffline = () => {
      setOffline(true);
      toast.error("Koneksi internet terputus. Jawaban akan tersimpan lagi saat sinyal kembali.");
      reportIncident("koneksi-terputus", "Koneksi internet kandidat terputus", { code: session?.code });
    };
    const goOnline = () => {
      setOffline(false);
      toast.success("Koneksi internet kembali normal.");
      reportIncident("koneksi-pulih", "Koneksi internet kandidat kembali normal", { code: session?.code });
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [session?.code]);

  // Sesi kandidat ditolak server (kode kedaluwarsa/nonaktif) -> catat sekali.
  const reportedSessionErr = useRef(false);
  useEffect(() => {
    if (!sessionError || reportedSessionErr.current) return;
    reportedSessionErr.current = true;
    reportIncident("sesi-tidak-valid", `Sesi kandidat ditolak: ${(sessionError as Error).message}`, {
      code: session?.code,
    });
  }, [sessionError, session?.code]);

  if (!session) return null;




  const nav_items = [
    { to: "/candidate/portal", label: "Overview", icon: Home, exact: true },
    { to: "/candidate/portal/data", label: "Data Diri", icon: User },
    
    { to: "/candidate/portal/tests", label: "Psikotest", icon: ClipboardList },
  ];

  return (
    <div className="touch-ui min-h-screen overflow-x-hidden bg-subtle">
      <header className="sticky top-0 z-40 border-b bg-card text-foreground shadow-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src={doverLogo.url} alt="Logo PT Dover Chemical" className="h-8 w-auto shrink-0 rounded p-0.5 object-contain" />
            <div className="min-w-0">
              <div className="truncate font-display text-xs font-bold sm:text-sm">PT DOVER CHEMICAL</div>
              <div className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">{candidateTypeLabel(session?.type, (profile as any)?.job_level)}</div>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden text-right md:block">
              <div className="text-sm font-medium">{session.candidate_name}</div>
              <div className="text-xs text-muted-foreground">Kode: {session.code}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setCandidateSession(null); nav({ to: "/" }); }}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </div>
      </header>
      {offline && (
        <div className="bg-destructive px-4 py-2 text-center text-xs font-medium text-destructive-foreground sm:px-6 sm:text-sm">
          Koneksi internet terputus. Jangan tutup halaman — jawaban tersimpan otomatis saat sinyal kembali.
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 sm:py-8 md:grid-cols-[220px_1fr] md:gap-6">
        <aside className="hidden space-y-1 md:block">
          {nav_items.map((it) => {
            const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
            return (
              <Link key={it.to} to={it.to} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                <it.icon className="h-4 w-4" />{it.label}
              </Link>
            );
          })}
        </aside>
        <main className="min-w-0 pb-20 md:pb-0">
          {sessionError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center">
              <div className="font-semibold text-destructive">Sesi kandidat tidak dapat digunakan</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {(sessionError as Error).message || "Kode akses tidak lagi berlaku."}
              </p>
              <Button
                className="mt-4"
                onClick={() => { setCandidateSession(null); nav({ to: "/candidate/login" }); }}
              >
                Masuk ulang dengan kode lain
              </Button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
      <MobileBottomNav items={nav_items} pathname={pathname} />
    </div>
  );
}
