import { createFileRoute, Link, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { candidateGetProfile } from "@/lib/candidate.functions";
import { toast } from "sonner";
import { useCandidateSession, setCandidateSession, DEVICE_CONFLICT_MESSAGE } from "@/lib/candidate-session";
import { Button } from "@/components/ui/button";
import { Beaker, LogOut, User, ClipboardList, Home } from "lucide-react";
import doverLogo from "@/assets/dover-logo.jpg.asset.json";

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
  const { error: sessionError } = useQuery({
    queryKey: ["candidate-profile", session?.code],
    queryFn: () => getProfile({ data: { code: session!.code, device: session!.device } }),
    enabled: !!session,
    retry: false,
    // Poll so a takeover from another device logs this one out promptly.
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  // One code = one device. If another device logged in with the same code,
  // the server rejects this session and we sign this device out immediately.
  const takenOver =
    !!sessionError && (sessionError as Error).message === DEVICE_CONFLICT_MESSAGE;
  useEffect(() => {
    if (!takenOver) return;
    toast.error(DEVICE_CONFLICT_MESSAGE);
    setCandidateSession(null);
    nav({ to: "/candidate/login" });
  }, [takenOver, nav]);

  if (!session) return null;


  const nav_items = [
    { to: "/candidate/portal", label: "Overview", icon: Home, exact: true },
    { to: "/candidate/portal/data", label: "Data Diri", icon: User },
    
    { to: "/candidate/portal/tests", label: "Psikotest", icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-subtle">
      <header className="border-b bg-card text-foreground shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={doverLogo.url} alt="Logo PT Dover Chemical" className="h-8 w-auto rounded p-0.5 object-contain" />
            <div>
              <div className="font-display text-sm font-bold">PT DOVER CHEMICAL</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Portal Kandidat</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-sm font-medium">{session.candidate_name}</div>
              <div className="text-xs text-muted-foreground">Kode: {session.code}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setCandidateSession(null); nav({ to: "/" }); }}>
              <LogOut className="mr-2 h-4 w-4" /> Keluar
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          {nav_items.map((it) => {
            const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
            return (
              <Link key={it.to} to={it.to} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                <it.icon className="h-4 w-4" />{it.label}
              </Link>
            );
          })}
        </aside>
        <main>
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
    </div>
  );
}
