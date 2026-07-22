import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireStaff, requireAdmin } from "@/lib/staff-middleware";
import { z } from "zod";

type AuditCtx = { supabase: any; userId: string };
async function logAudit(
  ctx: AuditCtx,
  action: string,
  target_type: string,
  target_id: string | null,
  metadata: Record<string, unknown> = {},
) {
  try {
    await ctx.supabase.from("audit_logs").insert({
      actor_id: ctx.userId,
      actor_type: "staff",
      action,
      target_type,
      target_id,
      metadata,
    });
  } catch (e) {
    // Do not block the primary action on audit-log failure; surface in server logs.
    console.error("audit_log_insert_failed", { action, target_type, target_id, error: (e as Error).message });
  }
}

/** Records that a staff member opened an admin surface (dashboard/candidates/etc.). */
export const logStaffAccess = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ area: z.string().trim().min(1).max(64) }).parse(d))
  .handler(async ({ context, data }) => {
    await logAudit(context, "admin.access", "area", null, { area: data.area });
    return { ok: true };
  });






/** Bootstrap: if no admin exists, promote current user to admin. */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) === 0) {
      await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
      return { promoted: true };
    }
    return { promoted: false };
  });

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    return { roles: (data ?? []).map((r) => r.role as string) };
  });

const CreateCodeInput = z.object({
  candidate_name: z.string().trim().min(2).max(120),
  candidate_email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  position_applied: z.string().max(120).optional().nullable(),
  code: z.string().trim().min(4).max(32).optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
});

function randomCode() {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "DOV-";
  for (let i = 0; i < 6; i++) s += alpha[Math.floor(Math.random() * alpha.length)];
  return s;
}

export const createCandidateCode = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => CreateCodeInput.parse(d))
  .handler(async ({ context, data }) => {
    const code = (data.code?.trim() || randomCode()).toUpperCase();
    const { data: row, error } = await context.supabase
      .from("candidate_codes")
      .insert({
        code,
        candidate_name: data.candidate_name,
        candidate_email: data.candidate_email || null,
        position_applied: data.position_applied || null,
        expires_at: data.expires_at || null,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { code: row };
  });

const BulkInput = z.object({
  count: z.number().int().min(1).max(1000),
  prefix: z.string().trim().max(16).optional().nullable(),
  position_applied: z.string().max(120).optional().nullable(),
  name_prefix: z.string().trim().max(60).optional().nullable(),
  start_number: z.number().int().min(1).max(100000).optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
});

export const bulkCreateCandidateCodes = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => BulkInput.parse(d))
  .handler(async ({ context, data }) => {
    const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const prefix = (data.prefix?.trim() || "DOV").toUpperCase().replace(/[^A-Z0-9]/g, "") || "DOV";
    const namePrefix = data.name_prefix?.trim() || "Kandidat";
    const start = data.start_number ?? 1;
    const seen = new Set<string>();
    function gen() {
      let s = "";
      for (let i = 0; i < 6; i++) s += alpha[Math.floor(Math.random() * alpha.length)];
      return `${prefix}-${s}`;
    }
    const rows: any[] = [];
    for (let i = 0; i < data.count; i++) {
      let c = gen();
      while (seen.has(c)) c = gen();
      seen.add(c);
      rows.push({
        code: c,
        candidate_name: `${namePrefix} ${String(start + i).padStart(3, "0")}`,
        position_applied: data.position_applied || null,
        active: true,
        expires_at: data.expires_at || null,
        created_by: context.userId,
      });
    }
    // insert in chunks; on unique collision, regenerate that row
    const inserted: any[] = [];
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      let attempt = 0;
      while (attempt < 5) {
        const { data: ok, error } = await context.supabase.from("candidate_codes").insert(chunk).select();
        if (!error) { inserted.push(...(ok ?? [])); break; }
        // collision on unique(code): regenerate all in chunk and retry
        for (const r of chunk) r.code = gen();
        attempt++;
        if (attempt === 5) throw new Error(error.message);
      }
    }
    return { created: inserted.length };
  });

export const bulkSetCodesActive = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error, count } = await context.supabase
      .from("candidate_codes")
      .update({ active: data.active }, { count: "exact" })
      .not("id", "is", null);
    if (error) throw new Error(error.message);
    await logAudit(
      context,
      data.active ? "code.activate_bulk" : "code.deactivate_bulk",
      "candidate_code",
      null,
      { updated: count ?? 0 },
    );
    return { updated: count ?? 0 };
  });

export const listCandidateCodes = createServerFn({ method: "GET" })
  .middleware([requireStaff])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("candidate_codes")
      .select("*, candidates(id, data_completed, updated_at)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { codes: data ?? [] };
  });

export const toggleCode = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: existing } = await context.supabase
      .from("candidate_codes")
      .select("code")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase.from("candidate_codes").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(
      context,
      data.active ? "code.activate" : "code.deactivate",
      "candidate_code",
      data.id,
      { code: existing?.code ?? null },
    );
    return { ok: true };
  });


export const deleteCode = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("candidate_codes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCandidates = createServerFn({ method: "GET" })
  .middleware([requireStaff])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("candidates")
      .select("*, candidate_codes(code, active), candidate_files(id, file_type), test_attempts(id, score, status, tests(name, test_type))")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { candidates: data ?? [] };
  });

export const getCandidateDetail = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: cand, error } = await context.supabase
      .from("candidates")
      .select("*, candidate_codes(*), candidate_files(*), test_attempts(*, tests(*))")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return { candidate: cand };
  });

export const getFileSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ path: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: signed, error } = await context.supabase.storage.from("candidate-files").createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const listTests = createServerFn({ method: "GET" })
  .middleware([requireStaff])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("tests")
      .select("*, test_questions(id)")
      .order("code");
    if (error) throw new Error(error.message);
    return { tests: (data ?? []).map((t: any) => ({ ...t, question_count: t.test_questions?.length ?? 0 })) };
  });

export const getTestWithQuestions = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [t, q] = await Promise.all([
      supabaseAdmin.from("tests").select("*").eq("id", data.id).single(),
      supabaseAdmin.from("test_questions").select("*").eq("test_id", data.id).order("question_number"),
    ]);
    if (t.error) throw new Error(t.error.message);
    return { test: t.data, questions: q.data ?? [] };
  });

export const getAttemptDetail = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: attempt, error } = await supabaseAdmin
      .from("test_attempts")
      .select("*, tests(*), candidates(id, full_name, candidate_codes(code)), test_answers(*)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: questions } = await supabaseAdmin
      .from("test_questions")
      .select("*")
      .eq("test_id", (attempt as any).test_id)
      .order("question_number");
    await logAudit(context, "attempt.view", "test_attempt", data.id, {
      candidate_id: (attempt as any)?.candidates?.id ?? null,
      test_id: (attempt as any)?.test_id ?? null,
      test_name: (attempt as any)?.tests?.name ?? null,
    });
    return { attempt, questions: questions ?? [] };
  });

const AuditListInput = z.object({
  limit: z.number().int().min(1).max(500).optional(),
  offset: z.number().int().min(0).max(100000).optional(),
  action: z.string().max(64).optional().nullable(),
  target_id: z.string().trim().max(120).optional().nullable(),
  from: z.string().datetime().optional().nullable(),
  to: z.string().datetime().optional().nullable(),
});

export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => AuditListInput.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const limit = data.limit ?? 50;
    const offset = data.offset ?? 0;
    let q = context.supabase
      .from("audit_logs")
      .select("id, actor_id, actor_type, actor_label, action, target_type, target_id, metadata, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (data.action) q = q.eq("action", data.action);
    if (data.target_id) q = q.ilike("target_id", `%${data.target_id}%`);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    // Resolve actor display names from profiles (best-effort).
    const ids = Array.from(new Set((rows ?? []).map((r: any) => r.actor_id).filter(Boolean)));
    let actors: Record<string, { full_name: string | null; username: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", ids);
      for (const p of profs ?? []) actors[(p as any).id] = { full_name: (p as any).full_name, username: (p as any).username };
    }
    return {
      logs: (rows ?? []).map((r: any) => ({ ...r, actor: actors[r.actor_id] ?? null })),
      total: count ?? 0,
      offset,
      limit,
    };
  });


export const dashboardStats = createServerFn({ method: "GET" })
  .middleware([requireStaff])
  .handler(async ({ context }) => {
    const [codes, cands, attempts] = await Promise.all([
      context.supabase.from("candidate_codes").select("id, active", { count: "exact" }),
      context.supabase.from("candidates").select("id, data_completed", { count: "exact" }),
      context.supabase.from("test_attempts").select("id, status, score"),
    ]);
    return {
      total_codes: codes.count ?? 0,
      active_codes: (codes.data ?? []).filter((c) => c.active).length,
      total_candidates: cands.count ?? 0,
      completed_profiles: (cands.data ?? []).filter((c) => c.data_completed).length,
      total_attempts: attempts.data?.length ?? 0,
      finished_attempts: (attempts.data ?? []).filter((a) => a.status === "finished").length,
      avg_score: (() => {
        const done = (attempts.data ?? []).filter((a) => a.status === "finished" && a.score != null);
        if (!done.length) return 0;
        return Math.round(done.reduce((s, a) => s + Number(a.score), 0) / done.length);
      })(),
    };
  });

export const setCodeExpiry = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ id: z.string().uuid(), expires_at: z.string().datetime().nullable() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("candidate_codes").update({ expires_at: data.expires_at }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkSetCodesExpiry = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ expires_at: z.string().datetime().nullable() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error, count } = await context.supabase
      .from("candidate_codes")
      .update({ expires_at: data.expires_at }, { count: "exact" })
      .not("id", "is", null);
    if (error) throw new Error(error.message);
    return { updated: count ?? 0 };
  });
