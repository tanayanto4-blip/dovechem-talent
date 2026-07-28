import { createFileRoute, Link, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCandidateSession, setCandidateSession } from "@/lib/candidate-session";
import { Button } from "@/components/ui/button";
import { Beaker, LogOut, User, ClipboardList, Home } from "lucide-react";

export const Route = createFileRoute("/candidate/portal")({
  head: () => ({ meta: [{ title: "Portal Kandidat — PT Dover Chemical" }] }),
  component: PortalLayout,
});

function PortalLayout() {
  const nav = useNavigate();
  const session = useCandidateSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (session === null && typeof window !== "undefined") {
      nav({ to: "/candidate/login" });
    }
  }, [session, nav]);

  if (!session) return null;

  const nav_items = [
    { to: "/candidate/portal", label: "Overview", icon: Home, exact: true },
    { to: "/candidate/portal/data", label: "Data Diri", icon: User },
    
    { to: "/candidate/portal/tests", label: "Psikotest", icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-subtle">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <Beaker className="h-5 w-5 text-primary-glow" />
            <div>
              <div className="font-display text-sm font-bold">PT DOVER CHEMICAL</div>
              <div className="text-[10px] uppercase tracking-widest text-white/60">Portal Kandidat</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-sm font-medium">{session.candidate_name}</div>
              <div className="text-xs text-white/60">Kode: {session.code}</div>
            </div>
            <Button variant="outline" size="sm" className="border-white/30 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground" onClick={() => { setCandidateSession(null); nav({ to: "/" }); }}>
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
        <main><Outlet /></main>
      </div>
    </div>
  );
}
