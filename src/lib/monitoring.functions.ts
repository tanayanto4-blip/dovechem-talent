import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStaff, requireAdmin } from "@/lib/staff-middleware";

const AREAS = ["admin", "hr", "candidate", "public"] as const;

const ReportInput = z.object({
  area: z.enum(AREAS).default("public"),
  route: z.string().trim().max(300).optional(),
  source: z.string().trim().max(60).default("window.onerror"),
  message: z.string().trim().min(1).max(1000),
  stack: z.string().trim().max(6000).optional(),
  actor_label: z.string().trim().max(120).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Public endpoint: any page (staff or candidate) can report a runtime failure.
 * Payload is strictly validated + truncated, and writes are throttled per
 * (message, route) so a render loop cannot flood the table.
 */
export const reportClientError = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ReportInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Throttle: skip if the same message on the same route was logged < 60s ago.
    const sinceIso = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("error_events")
      .select("id", { count: "exact", head: true })
      .eq("message", data.message)
      .eq("route", data.route ?? "")
      .gte("occurred_at", sinceIso);
    if ((count ?? 0) > 0) return { ok: true, throttled: true };

    const { error } = await supabaseAdmin.from("error_events").insert({
      area: data.area,
      route: data.route ?? "",
      source: data.source,
      message: data.message,
      stack: data.stack ?? null,
      actor_label: data.actor_label ?? null,
      context: (data.context ?? {}) as never,
    });
    if (error) return { ok: false, throttled: false };
    return { ok: true, throttled: false };
  });

/** Staff: list recent error events (newest first). */
export const listErrorEvents = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d: unknown) =>
    z
      .object({
        onlyOpen: z.boolean().default(false),
        area: z.enum(AREAS).optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("error_events")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(data.limit);
    if (data.onlyOpen) q = q.eq("resolved", false);
    if (data.area) q = q.eq("area", data.area);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const { count: openCount } = await supabaseAdmin
      .from("error_events")
      .select("id", { count: "exact", head: true })
      .eq("resolved", false);

    return { rows: rows ?? [], openCount: openCount ?? 0 };
  });

/** Staff: lightweight unresolved counter for the sidebar badge. */
export const countOpenErrors = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("error_events")
      .select("id", { count: "exact", head: true })
      .eq("resolved", false);
    return { open: count ?? 0 };
  });

/** Super Admin: mark an error handled (or reopen it). */
export const resolveErrorEvent = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        resolved: z.boolean(),
        note: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("error_events")
      .update({
        resolved: data.resolved,
        resolved_by: data.resolved ? context.userId : null,
        resolved_at: data.resolved ? new Date().toISOString() : null,
        resolution_note: data.note ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Super Admin: clear all resolved entries. */
export const clearResolvedErrors = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("error_events").delete().eq("resolved", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
