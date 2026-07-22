import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Extract best-effort client IP and User-Agent from the incoming request. */
function getRequestClientInfo(): { ip: string | null; user_agent: string | null } {
  let ip: string | null = null;
  let user_agent: string | null = null;
  try {
    ip = getRequestIP({ xForwardedFor: true }) ?? null;
  } catch {
    ip = null;
  }
  try {
    user_agent = getRequestHeader("user-agent") ?? null;
    if (user_agent && user_agent.length > 512) user_agent = user_agent.slice(0, 512);
  } catch {
    user_agent = null;
  }
  return { ip, user_agent };
}

/**
 * Emit a 403 response and record a denied-access entry into public.audit_logs
 * using the service-role client (RLS-bypass) so the trail is always written
 * even when the caller has no INSERT policy grant.
 */
/**
 * Rate-limit thresholds for repeated denied admin access from the same source.
 * If more than DENY_LIMIT denials occur within DENY_WINDOW_SECONDS for the
 * same (ip, user_id) pair, subsequent requests are answered with HTTP 429
 * (Retry-After: DENY_WINDOW_SECONDS) and audited as `admin.access.rate_limited`.
 */
const DENY_LIMIT = 10;
const DENY_WINDOW_SECONDS = 60;

async function denyAndAudit(params: {
  userId: string | null;
  reason: "not_staff" | "not_admin";
  required: "staff" | "admin";
  roles?: string[];
}): Promise<never> {
  const { ip, user_agent } = getRequestClientInfo();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Count recent denials from the same source (ip OR user_id) within the window.
  let rateLimited = false;
  try {
    const sinceIso = new Date(Date.now() - DENY_WINDOW_SECONDS * 1000).toISOString();
    let query = supabaseAdmin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .in("action", ["admin.access.denied", "admin.access.rate_limited"])
      .gte("created_at", sinceIso);
    if (params.userId) {
      query = query.eq("actor_id", params.userId);
    } else if (ip) {
      query = query.eq("metadata->>ip", ip);
    } else {
      query = query.eq("id", "00000000-0000-0000-0000-000000000000");
    }
    const { count } = await query;
    if ((count ?? 0) >= DENY_LIMIT) rateLimited = true;
  } catch (e) {
    console.error("audit_deny_ratecheck_failed", (e as Error).message);
  }

  try {
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: params.userId,
      actor_type: "staff",
      action: rateLimited ? "admin.access.rate_limited" : "admin.access.denied",
      target_type: "rbac",
      target_id: null,
      metadata: {
        reason: params.reason,
        required: params.required,
        roles: params.roles ?? [],
        ip,
        user_agent,
        ...(rateLimited
          ? { rate_limit: { limit: DENY_LIMIT, window_seconds: DENY_WINDOW_SECONDS } }
          : {}),
      },
    });
  } catch (e) {
    console.error("audit_deny_insert_failed", (e as Error).message);
  }

  if (rateLimited) {
    throw new Response(
      JSON.stringify({
        error: "Too Many Requests",
        reason: "rate_limited",
        retry_after_seconds: DENY_WINDOW_SECONDS,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(DENY_WINDOW_SECONDS),
        },
      },
    );
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
