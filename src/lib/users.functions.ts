import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/staff-middleware";
import { z } from "zod";

async function getAdminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}


/** Public: check if any admin account already exists (for bootstrap UI). */
export const bootstrapStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  return { needsBootstrap: (count ?? 0) === 0 };
});

const BootstrapInput = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(2).max(120),
  username: z.string().trim().min(2).max(60),
});

/** Public: create the very first admin — only works when no admin exists. */
export const createBootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => BootstrapInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Bootstrap sudah dilakukan. Hubungi admin untuk membuat akun.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, username: data.username },
    });
    if (error) throw new Error(error.message);
    const uid = created.user!.id;
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "admin" });
    return { ok: true };
  });

const CreateUserInput = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(2).max(120),
  username: z.string().trim().min(2).max(60),
  role: z.enum(["admin", "hr"]).default("hr"),
});

/** Admin: create a new HR / admin user. */
export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CreateUserInput.parse(d))
  .handler(async ({ context, data }) => {
    const admin = await ensureAdmin(context.userId);
    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, username: data.username },
    });
    if (error) throw new Error(error.message);
    const uid = created.user!.id;
    await admin.from("user_roles").insert({ user_id: uid, role: data.role });
    return { ok: true };
  });

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await ensureAdmin(context.userId);
    const { data: users, error } = await admin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);
    const { data: roles } = await admin.from("user_roles").select("user_id, role");
    const { data: profiles } = await admin.from("profiles").select("id, full_name, username");
    const rolesByUser = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return {
      users: users.users
        .filter((u) => rolesByUser.has(u.id))
        .map((u) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          roles: rolesByUser.get(u.id) ?? [],
          profile: profileMap.get(u.id) ?? null,
        })),
    };
  });

export const deleteAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    if (data.id === context.userId) throw new Error("Tidak bisa menghapus akun sendiri.");
    const admin = await ensureAdmin(context.userId);
    await admin.from("user_roles").delete().eq("user_id", data.id);
    const { error } = await admin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), password: z.string().min(8).max(72) }).parse(d))
  .handler(async ({ context, data }) => {
    const admin = await ensureAdmin(context.userId);
    const { error } = await admin.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
