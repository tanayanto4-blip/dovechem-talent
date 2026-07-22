import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Shared middleware for staff-only server functions.
 * Composes `requireSupabaseAuth` and enforces that the caller has the
 * `admin` or `hr` role in `public.user_roles` before any DB access.
 *
 * Adds `roles: string[]` and `isAdmin: boolean` to the handler context.
 */
export const requireStaff = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "hr"]);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      throw new Error("Forbidden: hanya staff (admin/hr) yang boleh mengakses.");
    }
    const roles = data.map((r: { role: string }) => r.role);
    return next({
      context: {
        roles,
        isAdmin: roles.includes("admin"),
      },
    });
  });

/**
 * Admin-only variant. Use for privileged operations (user management,
 * role grants, destructive maintenance).
 */
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireStaff])
  .server(async ({ next, context }) => {
    if (!context.isAdmin) {
      throw new Error("Forbidden: hanya admin yang boleh mengakses.");
    }
    return next();
  });
