import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { claimFirstAdmin } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Beaker, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Login Admin — PT Dover Chemical" }, { name: "description", content: "Login administrator HR PT Dover Chemical." }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const claim = useServerFn(claimFirstAdmin);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin/dashboard" });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    try { await claim({ data: {} as never }); } catch {}
    toast.success("Berhasil login");
    navigate({ to: "/admin/dashboard" });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin/dashboard`,
        data: { full_name: fullName, username },
      },
    });
    if (error) { toast.error(error.message); setLoading(false); return; }
    toast.success("Akun dibuat. Silakan login.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-hero p-4">
      <div className="mx-auto max-w-md pt-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <Card className="shadow-elegant">
          <CardHeader className="text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-hero text-primary-foreground">
              <Beaker className="h-6 w-6" />
            </div>
            <CardTitle className="mt-3 font-display text-2xl">Portal Admin HR</CardTitle>
            <CardDescription>PT Dover Chemical — Recruitment Management</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Login</TabsTrigger>
                <TabsTrigger value="signup">Buat Akun</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="e">Email</Label>
                    <Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p">Password</Label>
                    <Input id="p" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "Memproses..." : "Login"}</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                  <div className="space-y-2"><Label htmlFor="fn">Nama Lengkap</Label><Input id="fn" required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="u">Username</Label><Input id="u" required value={username} onChange={(e) => setUsername(e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="e2">Email</Label><Input id="e2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="p2">Password</Label><Input id="p2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "Memproses..." : "Buat Akun"}</Button>
                  <p className="text-xs text-muted-foreground">User pertama akan otomatis menjadi Super Admin.</p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
