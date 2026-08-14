import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { getMyRoles, logStaffAccess } from "@/lib/admin.functions";
import { countOpenErrors } from "@/lib/monitoring.functions";
import { useCandidatesRealtime } from "@/hooks/use-candidates-realtime";
import { Button } from "@/components/ui/button";
import { Beaker, LayoutDashboard, KeyRound, Users, LogOut, UserCog, ClipboardList, ShieldCheck, FolderOpen, BarChart3, Volume2, Unlock, AlertTriangle } from "lucide-react";
import doverLogo from "@/assets/dover-logo.jpg.asset.json";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Panel Admin & HR — PT Dover Chemical" },
    { name: "description", content: "Area kerja tim HR PT Dover Chemical untuk mengelola kandidat, kode akses, bank soal, dan hasil psikotest." },
    { property: "og:title", content: "Panel Admin & HR — PT Dover Chemical" },
    { property: "og:description", content: "Area kerja tim HR PT Dover Chemical untuk mengelola kandidat, kode akses, bank soal, dan hasil psikotest." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const rolesFn = useServerFn(getMyRoles);
  const { data: roles } = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn({ data: {} as never }) });

  // Biodata yang diubah kandidat langsung tersinkron ke dashboard staf.
  useCandidatesRealtime();



  // Audit staff dashboard access — one entry per area per session.
  const logAccess = useServerFn(logStaffAccess);
  const loggedAreas = useRef<Set<string>>(new Set());
  useEffect(() => {
    const seg = pathname.replace(/^\/admin\/?/, "").split("/")[0] || "dashboard";
    if (loggedAreas.current.has(seg)) return;
    loggedAreas.current.add(seg);
    logAccess({ data: { area: seg } }).catch(() => {});
  }, [pathname, logAccess]);

  const isAdmin = !!roles?.roles?.includes("admin");

  // Monitoring: hitung error yang belum ditangani untuk badge sidebar.
  const countFn = useServerFn(countOpenErrors);
  const { data: openErrors } = useQuery({
    queryKey: ["error-open-count"],
    queryFn: () => countFn({ data: {} as never }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const items = [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/codes", label: "Kode Kandidat", icon: KeyRound },
    { to: "/admin/candidates", label: "Kandidat", icon: Users },
    { to: "/admin/documents", label: "Bank Dokumen", icon: FolderOpen },
    { to: "/admin/tests", label: "Bank Soal", icon: ClipboardList },
    { to: "/admin/instruksi", label: "Instruksi Suara", icon: Volume2 },
    { to: "/admin/test-access", label: "Kontrol Test", icon: Unlock },
    { to: "/admin/results", label: "Bank Data Hasil", icon: BarChart3 },
    { to: "/admin/monitoring", label: "Monitor Error", icon: AlertTriangle, badge: openErrors?.open ?? 0 },
    ...(isAdmin ? [
      { to: "/admin/users", label: "User Admin/HR", icon: UserCog },
      { to: "/admin/audit", label: "Audit Log", icon: ShieldCheck },
    ] : []),

  ];


  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-subtle">
      <header className="sticky top-0 z-40 border-b bg-card text-foreground shadow-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src={doverLogo.url} alt="Logo PT Dover Chemical" className="h-8 w-auto shrink-0 rounded p-0.5 object-contain" />
            <div className="min-w-0">
              <div className="truncate font-display text-xs font-bold sm:text-sm">PT DOVER CHEMICAL</div>
              <div className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">Admin HR Panel</div>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {roles?.roles?.length ? (
              <span className="hidden rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground md:inline-block">
                {roles.roles.join(", ")}
              </span>
            ) : null}
            <Button size="sm" variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </div>
        {/* Navigasi horizontal untuk layar HP */}
        <nav className="-mx-px flex gap-1.5 overflow-x-auto border-t px-4 py-2 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((it) => {
            const active = pathname.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
              >
                <it.icon className="h-3.5 w-3.5" />
                {it.label}
                {"badge" in it && (it as { badge?: number }).badge ? (
                  <span className="rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {(it as { badge?: number }).badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 sm:py-8 md:grid-cols-[220px_1fr] md:gap-6">
        <aside className="hidden space-y-1 md:block">
          {items.map((it) => {
            const active = pathname.startsWith(it.to);
            return (
              <Link key={it.to} to={it.to} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                <it.icon className="h-4 w-4" />
                <span className="flex-1">{it.label}</span>
                {"badge" in it && (it as { badge?: number }).badge ? (
                  <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                    {(it as { badge?: number }).badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </aside>
        <main className="min-w-0"><Outlet /></main>
      </div>
    </div>
  );
}
