import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Beaker, LayoutDashboard, KeyRound, Users, LogOut, UserCog, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/admin")({
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

  const items = [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/codes", label: "Kode Kandidat", icon: KeyRound },
    { to: "/admin/candidates", label: "Kandidat", icon: Users },
    { to: "/admin/tests", label: "Bank Soal", icon: ClipboardList },
    { to: "/admin/users", label: "User Admin/HR", icon: UserCog },
  ];

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-subtle">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <Beaker className="h-5 w-5 text-primary-glow" />
            <div>
              <div className="font-display text-sm font-bold">PT DOVER CHEMICAL</div>
              <div className="text-[10px] uppercase tracking-widest text-white/60">Admin HR Panel</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {roles?.roles?.length ? (
              <span className="hidden rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-xs md:inline-block">
                {roles.roles.join(", ")}
              </span>
            ) : null}
            <Button size="sm" variant="outline" className="border-white/30 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Keluar
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          {items.map((it) => {
            const active = pathname.startsWith(it.to);
            return (
              <Link key={it.to} to={it.to} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
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
