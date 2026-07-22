import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Emit a 403 response and record a denied-access entry into public.audit_logs
 * using the service-role client (RLS-bypass) so the trail is always written
 * even when the caller has no INSERT policy grant.
 */
async function denyAndAudit(params: {
  userId: string | null;
  reason: "not_staff" | "not_admin";
  required: "staff" | "admin";
  roles?: string[];
}): Promise<never> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: params.userId,
      actor_type: "staff",
      action: "admin.access.denied",
      target_type: "rbac",
      target_id: null,
      metadata: {
        reason: params.reason,
        required: params.required,
        roles: params.roles ?? [],
      },
    });
  } catch (e) {
    console.error("audit_deny_insert_failed", (e as Error).message);
  }
  throw new Response(
    JSON.stringify({
      error: "Forbidden",
      reason: params.reason,
      required: params.required,
    }),
    { status: 403, headers: { "Content-Type": "application/json" } },
  );
}

/**
 * Staff-only middleware. Enforces `admin` or `hr` in `public.user_roles`.
 * Denials return HTTP 403 and are always audit-logged.
 */
export const requireStaff = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "hr"]);
    if (error || !data || data.length === 0) {
      await denyAndAudit({ userId: context.userId, reason: "not_staff", required: "staff" });
    }
    const roles = (data as Array<{ role: string }>).map((r) => r.role);
    return next({
      context: {
        roles,
        isAdmin: roles.includes("admin"),
      },
    });
  });

/**
 * Admin-only middleware for privileged operations. Denials return HTTP 403
 * and are audit-logged with the caller's current roles.
 */
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireStaff])
  .server(async ({ next, context }) => {
    if (!context.isAdmin) {
      await denyAndAudit({
        userId: context.userId,
        reason: "not_admin",
        required: "admin",
        roles: context.roles,
      });
    }
    return next();
  });
