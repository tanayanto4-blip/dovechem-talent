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

export const listCandidateCodes = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ limit: z.number().int().min(1).max(1000).optional(), offset: z.number().int().min(0).optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const limit = data.limit ?? 500;
    const offset = data.offset ?? 0;
    const { data: rows, error, count } = await context.supabase
      .from("candidate_codes")
      .select("*, candidates(id, data_completed, updated_at)", { count: "exact" })
      .order("created_at", { ascending: false })
      .order("code", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(error.message);
    return { codes: rows ?? [], total: count ?? 0, limit, offset };
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
    const { data: existing } = await context.supabase
      .from("candidate_codes")
      .select("code")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase.from("candidate_codes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context, "code.delete", "candidate_code", data.id, { code: existing?.code ?? null });
    return { ok: true };
  });

/**
 * Delete every candidate access code at once. Candidate profiles, uploaded
 * documents and test results are preserved: the FK is ON DELETE SET NULL and a
 * DB trigger snapshots the code text onto the candidate row first.
 */
export const deleteAllCodes = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ confirm: z.literal("HAPUS SEMUA") }).parse(d))
  .handler(async ({ context }) => {
    const { count } = await context.supabase
      .from("candidate_codes")
      .select("id", { count: "exact", head: true });
    const { error } = await context.supabase
      .from("candidate_codes")
      .delete()
      .not("id", "is", null);
    if (error) throw new Error(error.message);
    await logAudit(context, "code.delete_all", "candidate_code", null, { deleted: count ?? 0 });
    return { deleted: count ?? 0 };
  });


export const listCandidates = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ limit: z.number().int().min(1).max(1000).optional(), offset: z.number().int().min(0).optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const limit = data.limit ?? 500;
    const offset = data.offset ?? 0;
    const { data: rows, error, count } = await context.supabase
      .from("candidates")
      .select(
        "*, candidate_codes(code, active), candidate_files(id, file_type), test_attempts(id, score, status, tests(name, test_type))",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(error.message);
    return { candidates: rows ?? [], total: count ?? 0, limit, offset };
  });

/** Kosongkan biodata seorang kandidat (kode akses, dokumen dan hasil test tetap ada). */
export const clearCandidateBiodata = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: existing } = await context.supabase
      .from("candidates")
      .select("full_name")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase
      .from("candidates")
      .update({
        full_name: null,
        nik: null,
        birth_place: null,
        birth_date: null,
        gender: null,
        address: null,
        phone: null,
        email: null,
        position_applied: null,
        education: null,
        marital_status: null,
        school_name: null,
        major: null,
        work_experience: null,
        data_completed: false,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context, "candidate.biodata_delete", "candidate", data.id, {
      full_name: existing?.full_name ?? null,
    });
    return { ok: true };
  });

/** Hapus seluruh hasil psikotest (attempt + jawaban) milik satu kandidat. */
export const deleteCandidateResults = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ candidate_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: attempts, error: listErr } = await context.supabase
      .from("test_attempts")
      .select("id")
      .eq("candidate_id", data.candidate_id);
    if (listErr) throw new Error(listErr.message);
    const ids = (attempts ?? []).map((a) => a.id);
    if (ids.length) {
      const { error: ansErr } = await context.supabase.from("test_answers").delete().in("attempt_id", ids);
      if (ansErr) throw new Error(ansErr.message);
      const { error: attErr } = await context.supabase.from("test_attempts").delete().in("id", ids);
      if (attErr) throw new Error(attErr.message);
    }
    await logAudit(context, "candidate.results_delete", "candidate", data.candidate_id, { deleted: ids.length });
    return { ok: true, deleted: ids.length };
  });

/** Hapus satu kandidat beserta seluruh data turunannya (jawaban, attempt, berkas, akses test). */
export const deleteCandidate = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: cand } = await sb.from("candidates").select("full_name").eq("id", data.id).maybeSingle();

    const { data: attempts, error: listErr } = await sb.from("test_attempts").select("id").eq("candidate_id", data.id);
    if (listErr) throw new Error(listErr.message);
    const ids = (attempts ?? []).map((a) => a.id);
    if (ids.length) {
      const { error: ansErr } = await sb.from("test_answers").delete().in("attempt_id", ids);
      if (ansErr) throw new Error(ansErr.message);
      const { error: attErr } = await sb.from("test_attempts").delete().in("id", ids);
      if (attErr) throw new Error(attErr.message);
    }
    await sb.from("candidate_files").delete().eq("candidate_id", data.id);
    await sb.from("candidate_test_access").delete().eq("candidate_id", data.id);

    const { error } = await sb.from("candidates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    await logAudit(context, "candidate.delete", "candidate", data.id, {
      full_name: cand?.full_name ?? null,
      attempts_deleted: ids.length,
    });
    return { ok: true, deleted_attempts: ids.length };
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
    await logAudit(context, "candidate.file.view", "file", null, { path: data.path });
    return { url: signed.signedUrl };
  });

/** Document bank: list every uploaded candidate file with candidate identity for staff/admin. */
export const listAllCandidateFiles = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ limit: z.number().int().min(1).max(1000).optional(), offset: z.number().int().min(0).optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = data.limit ?? 500;
    const offset = data.offset ?? 0;
    const { data: rows, error, count } = await supabaseAdmin
      .from("candidate_files")
      .select(
        "id, file_type, file_name, file_path, file_size, mime_type, uploaded_at, candidate_id, candidates(id, full_name, nik, position_applied, code_snapshot, candidate_codes(code))",
        { count: "exact" },
      )
      .order("uploaded_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(error.message);
    await logAudit(context, "candidate.files.list", "area", null, { count: rows?.length ?? 0 });
    return { files: rows ?? [], total: count ?? 0, limit, offset };
  });

export const listCandidateFileVersions = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ candidate_id: z.string().uuid(), file_type: z.string().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("candidate_file_versions")
      .select("*")
      .eq("candidate_id", data.candidate_id)
      .order("uploaded_at", { ascending: false });
    if (data.file_type) q = q.eq("file_type", data.file_type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { versions: rows ?? [] };
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
      .select(
        "*, tests(*), candidates(id, full_name, code_snapshot, school_name, education, major, work_experience, phone, email, position_applied, gender, birth_date, birth_place, nik, address, marital_status, candidate_codes(code)), test_answers(*)",
      )
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
  actor_id: z.string().uuid().optional().nullable(),
  actor_type: z.enum(["staff", "candidate", "system"]).optional().nullable(),
  only_denied: z.boolean().optional().nullable(),
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
    if (data.only_denied) q = q.eq("action", "admin.access.denied");
    else if (data.action) q = q.eq("action", data.action);
    if (data.actor_id) q = q.eq("actor_id", data.actor_id);
    if (data.actor_type) q = q.eq("actor_type", data.actor_type);
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

/** Toggle a test's publish/active status. */
export const setTestActive = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const before = await supabaseAdmin.from("tests").select("name, code, test_type, active").eq("id", data.id).single();
    const { error } = await supabaseAdmin.from("tests").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    const t: any = before.data ?? {};
    const isMbti = t.test_type === "mbti";
    await logAudit(
      context,
      isMbti
        ? (data.active ? "mbti.test.publish" : "mbti.test.unpublish")
        : (data.active ? "test.publish" : "test.unpublish"),
      "test",
      data.id,
      { active: data.active, previous_active: t.active ?? null, test_name: t.name ?? null, test_code: t.code ?? null, test_type: t.test_type ?? null },
    );
    return { ok: true };
  });

/** Publish/unpublish satu atau beberapa soal (semua jenis test). */
export const setQuestionsPublished = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z.object({
      ids: z.array(z.string().uuid()).min(1).max(1000),
      active: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const before = await supabaseAdmin
      .from("test_questions")
      .select("id, test_id, question_number, active")
      .in("id", data.ids);
    const rows = (before.data ?? []) as any[];
    if (rows.length === 0) throw new Error("Soal tidak ditemukan.");
    const ids = rows.map((r) => r.id);
    const { error, count } = await supabaseAdmin
      .from("test_questions")
      .update({ active: data.active }, { count: "exact" })
      .in("id", ids);
    if (error) throw new Error(error.message);
    await logAudit(
      context,
      data.active ? "question.publish" : "question.unpublish",
      "test_question",
      ids.length === 1 ? ids[0] : null,
      {
        active: data.active,
        count: count ?? ids.length,
        ids,
        numbers: rows.map((r) => r.question_number),
        test_ids: Array.from(new Set(rows.map((r) => r.test_id))),
      },
    );
    return { ok: true, updated: count ?? ids.length };
  });

/** Publish/unpublish seluruh soal pada satu test sekaligus. */
export const setAllQuestionsPublished = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ test_id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error, count } = await supabaseAdmin
      .from("test_questions")
      .update({ active: data.active }, { count: "exact" })
      .eq("test_id", data.test_id);
    if (error) throw new Error(error.message);
    await logAudit(
      context,
      data.active ? "question.publish_all" : "question.unpublish_all",
      "test",
      data.test_id,
      { active: data.active, count: count ?? 0 },
    );
    return { ok: true, updated: count ?? 0 };
  });



const MbtiOption = z.object({
  key: z.enum(["A", "B"]),
  label: z.string().trim().min(1).max(500),
  dimension: z.enum(["E", "I", "S", "N", "T", "F", "J", "P"]),
});
const MbtiUpsertInput = z.object({
  test_id: z.string().uuid(),
  question_id: z.string().uuid().optional().nullable(),
  question_number: z.number().int().min(1).max(200),
  question_text: z.string().trim().min(1).max(500),
  options: z.tuple([MbtiOption, MbtiOption]),
});

/** Create or update an MBTI question (A/B forced-choice). */
export const upsertMbtiQuestion = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => MbtiUpsertInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const t = await supabaseAdmin.from("tests").select("test_type").eq("id", data.test_id).single();
    if (t.error || (t.data as any)?.test_type !== "mbti") throw new Error("Test bukan MBTI.");
    const [a, b] = data.options;
    if (a.key === b.key) throw new Error("Kunci A dan B harus berbeda.");
    const dimension = `${a.dimension}/${b.dimension}`;
    const payload = {
      test_id: data.test_id,
      question_number: data.question_number,
      question_text: data.question_text,
      options: data.options,
      dimension,
    };
    if (data.question_id) {
      const prev = await supabaseAdmin
        .from("test_questions")
        .select("question_number, question_text, options, dimension")
        .eq("id", data.question_id)
        .maybeSingle();
      const { error } = await supabaseAdmin.from("test_questions").update(payload).eq("id", data.question_id);
      if (error) throw new Error(error.message);
      await logAudit(context, "mbti.question.update", "test_question", data.question_id, {
        test_id: data.test_id,
        question_number: data.question_number,
        dimension,
        before: prev.data ?? null,
        after: { question_number: data.question_number, question_text: data.question_text, options: data.options, dimension },
      });
      return { ok: true, id: data.question_id };
    }
    const { data: ins, error } = await supabaseAdmin.from("test_questions").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await logAudit(context, "mbti.question.create", "test_question", (ins as any).id, {
      test_id: data.test_id,
      question_number: data.question_number,
      dimension,
      question_text: data.question_text,
      options: data.options,
    });
    return { ok: true, id: (ins as any).id };
  });

/* ------------------------------------------------------------------ */
/* Editor soal generik (semua jenis test di Bank Soal) — khusus admin   */
/* ------------------------------------------------------------------ */



/** Create or update ANY test question (multiple choice, DISC, free text, Pauli, dll). */
export const upsertTestQuestion = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => QuestionUpsertInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const t = await supabaseAdmin.from("tests").select("id").eq("id", data.test_id).maybeSingle();
    if (t.error || !t.data) throw new Error("Test tidak ditemukan.");

    const payload: Record<string, unknown> = {
      test_id: data.test_id,
      question_number: data.question_number,
      question_text: data.question_text,
      dimension: data.dimension?.trim() ? data.dimension.trim() : null,
      correct_answer: data.correct_answer?.trim() ? data.correct_answer.trim() : null,
      options: data.options ?? null,
    };
    if (typeof data.active === "boolean") payload.active = data.active;

    if (data.question_id) {
      const prev = await supabaseAdmin
        .from("test_questions")
        .select("question_number, question_text, options, dimension, correct_answer, active")
        .eq("id", data.question_id)
        .maybeSingle();
      const { error } = await supabaseAdmin.from("test_questions").update(payload as any).eq("id", data.question_id);
      if (error) throw new Error(error.message);
      await logAudit(context, "question.update", "test_question", data.question_id, {
        test_id: data.test_id,
        question_number: data.question_number,
        before: prev.data ?? null,
        after: payload,
      });
      return { ok: true, id: data.question_id };
    }

    const { data: ins, error } = await supabaseAdmin
      .from("test_questions")
      .insert(payload as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(context, "question.create", "test_question", (ins as any).id, {
      test_id: data.test_id,
      question_number: data.question_number,
      after: payload,
    });
    return { ok: true, id: (ins as any).id };
  });

/** Delete ANY test question. */
export const deleteTestQuestion = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const prev = await supabaseAdmin
      .from("test_questions")
      .select("test_id, question_number, question_text, options, dimension, correct_answer")
      .eq("id", data.id)
      .maybeSingle();
    await supabaseAdmin.from("test_answers").delete().eq("question_id", data.id);
    const { error } = await supabaseAdmin.from("test_questions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context, "question.delete", "test_question", data.id, {
      test_id: (prev.data as any)?.test_id ?? null,
      snapshot: prev.data ?? null,
    });
    return { ok: true };
  });

/** Update test metadata (nama, deskripsi, instruksi) — admin only. */
export const updateTestMeta = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(160),
      description: z.string().trim().max(2000).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tests")
      .update({ name: data.name, description: data.description?.trim() || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context, "test.update_meta", "test", data.id, { name: data.name });
    return { ok: true };
  });

/** Delete an MBTI question. */

export const deleteMbtiQuestion = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const prev = await supabaseAdmin
      .from("test_questions")
      .select("test_id, question_number, question_text, options, dimension")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin.from("test_questions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context, "mbti.question.delete", "test_question", data.id, {
      test_id: (prev.data as any)?.test_id ?? null,
      question_number: (prev.data as any)?.question_number ?? null,
      snapshot: prev.data ?? null,
    });
    return { ok: true };
  });

/** Bulk enable/disable publish for multiple MBTI questions. */
export const setMbtiQuestionsActive = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z.object({
      ids: z.array(z.string().uuid()).min(1).max(500),
      active: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const before = await supabaseAdmin
      .from("test_questions")
      .select("id, test_id, question_number, active, tests!inner(test_type)")
      .in("id", data.ids);
    const rows = ((before.data ?? []) as any[]).filter((r) => r.tests?.test_type === "mbti");
    if (rows.length === 0) throw new Error("Tidak ada soal MBTI yang cocok.");
    const ids = rows.map((r) => r.id);
    const { error, count } = await supabaseAdmin
      .from("test_questions")
      .update({ active: data.active }, { count: "exact" })
      .in("id", ids);
    if (error) throw new Error(error.message);
    await logAudit(
      context,
      data.active ? "mbti.question.bulk_publish" : "mbti.question.bulk_unpublish",
      "test_question",
      null,
      {
        active: data.active,
        count: count ?? ids.length,
        requested: data.ids.length,
        ids,
        numbers: rows.map((r) => r.question_number),
        test_ids: Array.from(new Set(rows.map((r) => r.test_id))),
      },
    );
    return { ok: true, updated: count ?? ids.length, skipped: data.ids.length - ids.length };
  });

/** Bulk delete multiple MBTI questions. Restricted to MBTI test_type; logs a snapshot. */
export const deleteMbtiQuestions = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const before = await supabaseAdmin
      .from("test_questions")
      .select("id, test_id, question_number, question_text, options, dimension, tests!inner(test_type)")
      .in("id", data.ids);
    const rows = ((before.data ?? []) as any[]).filter((r) => r.tests?.test_type === "mbti");
    if (rows.length === 0) throw new Error("Tidak ada soal MBTI yang cocok.");
    const ids = rows.map((r) => r.id);
    const { error, count } = await supabaseAdmin
      .from("test_questions")
      .delete({ count: "exact" })
      .in("id", ids);
    if (error) throw new Error(error.message);
    await logAudit(context, "mbti.question.bulk_delete", "test_question", null, {
      count: count ?? ids.length,
      requested: data.ids.length,
      ids,
      numbers: rows.map((r) => r.question_number),
      test_ids: Array.from(new Set(rows.map((r) => r.test_id))),
      snapshot: rows.map((r) => ({
        id: r.id, test_id: r.test_id, question_number: r.question_number,
        question_text: r.question_text, options: r.options, dimension: r.dimension,
      })),
    });
    return { ok: true, deleted: count ?? ids.length, skipped: data.ids.length - ids.length };
  });


/** Reassign question_number for MBTI questions to match the given ID order (1..N). */
export const reorderMbtiQuestions = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z.object({
      test_id: z.string().uuid(),
      ordered_ids: z.array(z.string().uuid()).min(1).max(500),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const t = await supabaseAdmin.from("tests").select("test_type").eq("id", data.test_id).single();
    if (t.error || (t.data as any)?.test_type !== "mbti") throw new Error("Test bukan MBTI.");
    const cur = await supabaseAdmin
      .from("test_questions")
      .select("id, question_number")
      .eq("test_id", data.test_id);
    if (cur.error) throw new Error(cur.error.message);
    const existing = new Map(((cur.data ?? []) as any[]).map((r) => [r.id, r.question_number]));
    const before = ((cur.data ?? []) as any[])
      .slice()
      .sort((a, b) => a.question_number - b.question_number)
      .map((r) => ({ id: r.id, question_number: r.question_number }));
    const seen = new Set<string>();
    const finalOrder: string[] = [];
    for (const id of data.ordered_ids) {
      if (!existing.has(id) || seen.has(id)) continue;
      seen.add(id);
      finalOrder.push(id);
    }
    // Append any missing IDs at the end, preserving their prior order.
    for (const r of before) if (!seen.has(r.id)) finalOrder.push(r.id);

    // Two-phase update guards against any (test_id, question_number) unique index
    // by parking everyone in a negative range first, then assigning 1..N.
    for (let i = 0; i < finalOrder.length; i++) {
      const { error } = await supabaseAdmin
        .from("test_questions")
        .update({ question_number: -(i + 1) })
        .eq("id", finalOrder[i]);
      if (error) throw new Error(error.message);
    }
    for (let i = 0; i < finalOrder.length; i++) {
      const { error } = await supabaseAdmin
        .from("test_questions")
        .update({ question_number: i + 1 })
        .eq("id", finalOrder[i]);
      if (error) throw new Error(error.message);
    }

    const after = finalOrder.map((id, i) => ({ id, question_number: i + 1 }));
    await logAudit(context, "mbti.question.reorder", "test", data.test_id, {
      test_id: data.test_id,
      count: finalOrder.length,
      before,
      after,
    });
    return { ok: true, count: finalOrder.length };
  });

/** Audit trail for MBTI question-bank exports (CSV/JSON) initiated from the admin UI. */
export const logMbtiExport = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) =>
    z
      .object({
        test_id: z.string().uuid(),
        format: z.enum(["csv", "json"]),
        count: z.number().int().nonnegative(),
        published_count: z.number().int().nonnegative().optional(),
        draft_count: z.number().int().nonnegative().optional(),
        filename: z.string().trim().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await logAudit(context, "mbti.bank.export", "test", data.test_id, {
      format: data.format,
      count: data.count,
      published_count: data.published_count ?? null,
      draft_count: data.draft_count ?? null,
      filename: data.filename ?? null,
    });
    return { ok: true };
  });




/**
 * Bank Data Hasil — staff-only listing of every psikotest attempt across all
 * candidates. Scores/results are visible to admin & HR only.
 */
export const listAllAttempts = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ limit: z.number().int().min(1).max(1000).optional(), offset: z.number().int().min(0).optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const limit = data.limit ?? 500;
    const offset = data.offset ?? 0;
    const { data: rows, error, count } = await context.supabase
      .from("test_attempts")
      .select(
        "id, status, score, result, started_at, finished_at, test_id, candidate_id, tests(id, code, name, test_type), candidates(id, full_name, position_applied, code_snapshot, candidate_codes(code))",
        { count: "exact" },
      )
      .order("finished_at", { ascending: false, nullsFirst: false })
      .order("started_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(error.message);
    return { attempts: rows ?? [], total: count ?? 0, limit, offset };
  });


/* ---------------- Instruksi Suara per Test (Admin & HR) ---------------- */

/** Staff-only: list every test with its voice-instruction settings. */
export const listVoiceInstructions = createServerFn({ method: "GET" })
  .middleware([requireStaff])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tests")
      .select("id, code, name, test_type, active, duration_minutes, voice_instruction, voice_enabled, voice_lang, voice_rate, voice_autoplay, voice_mode, voice_audio_path, voice_audio_name, voice_audio_mime")
      .order("code");
    if (error) throw new Error(error.message);
    const tests = await Promise.all(
      (data ?? []).map(async (t: any) => {
        if (!t.voice_audio_path) return { ...t, voice_audio_url: null };
        const { data: signed } = await context.supabase.storage
          .from("voice-instructions")
          .createSignedUrl(t.voice_audio_path, 60 * 60);
        return { ...t, voice_audio_url: signed?.signedUrl ?? null };
      }),
    );
    return { tests };
  });

const VoiceInput = z.object({
  test_id: z.string().uuid(),
  voice_instruction: z.string().trim().max(4000).nullable().optional(),
  voice_enabled: z.boolean(),
  voice_lang: z.string().trim().min(2).max(16),
  voice_rate: z.number().min(0.5).max(2),
  voice_autoplay: z.boolean(),
  voice_mode: z.enum(["tts", "audio"]).default("tts"),
  voice_audio_path: z.string().trim().max(400).nullable().optional(),
  voice_audio_name: z.string().trim().max(200).nullable().optional(),
  voice_audio_mime: z.string().trim().max(100).nullable().optional(),
});

/** Staff-only: save the spoken instruction text/settings for one test. */
export const saveVoiceInstruction = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => VoiceInput.parse(d))
  .handler(async ({ context, data }) => {
    const text = (data.voice_instruction ?? "").trim();
    const { error } = await context.supabase
      .from("tests")
      .update({
        voice_instruction: text.length ? text : null,
        voice_enabled: data.voice_enabled,
        voice_lang: data.voice_lang,
        voice_rate: data.voice_rate,
        voice_autoplay: data.voice_autoplay,
        voice_mode: data.voice_mode,
        voice_audio_path: data.voice_audio_path ?? null,
        voice_audio_name: data.voice_audio_name ?? null,
        voice_audio_mime: data.voice_audio_mime ?? null,
      })
      .eq("id", data.test_id);
    if (error) throw new Error(error.message);
    await logAudit(context, "test.voice_instruction.update", "test", data.test_id, {
      enabled: data.voice_enabled,
      lang: data.voice_lang,
      rate: data.voice_rate,
      autoplay: data.voice_autoplay,
      mode: data.voice_mode,
      audio: data.voice_audio_name ?? null,
      length: text.length,
    });
    return { ok: true };
  });

/* ---------------- Akses Test Kandidat: Buka / Tutup / Ulangi ---------------- */

/** Staff-only: tests + attempt status + open/close access state for one candidate. */
export const listCandidateTestAccess = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) => z.object({ candidate_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const [testsQ, attemptsQ, accessQ] = await Promise.all([
      context.supabase.from("tests").select("id, code, name, test_type, duration_minutes, active").order("code"),
      context.supabase
        .from("test_attempts")
        .select("id, test_id, status, started_at, finished_at, score")
        .eq("candidate_id", data.candidate_id),
      context.supabase
        .from("candidate_test_access")
        .select("test_id, is_open, reason, retake_count, last_reopened_at, updated_at")
        .eq("candidate_id", data.candidate_id),
    ]);
    return {
      tests: testsQ.data ?? [],
      attempts: attemptsQ.data ?? [],
      access: accessQ.data ?? [],
      isAdmin: context.isAdmin,
    };
  });

const AccessInput = z.object({
  candidate_id: z.string().uuid(),
  test_id: z.string().uuid(),
  is_open: z.boolean(),
  reason: z.string().trim().max(300).optional().nullable(),
});

/** Admin-only: open or close a single test for a candidate. */
export const setCandidateTestAccess = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => AccessInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("candidate_test_access").upsert(
      {
        candidate_id: data.candidate_id,
        test_id: data.test_id,
        is_open: data.is_open,
        reason: data.reason?.length ? data.reason : null,
        updated_by: context.userId,
      },
      { onConflict: "candidate_id,test_id" },
    );
    if (error) throw new Error(error.message);
    await logAudit(context, data.is_open ? "test.access.open" : "test.access.close", "candidate", data.candidate_id, {
      test_id: data.test_id,
      reason: data.reason ?? null,
    });
    return { ok: true };
  });

/** Admin-only: open or close every active test for a candidate at once. */
export const setAllCandidateTestAccess = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z.object({ candidate_id: z.string().uuid(), is_open: z.boolean(), reason: z.string().trim().max(300).optional().nullable() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: tests } = await context.supabase.from("tests").select("id").eq("active", true);
    const rows = (tests ?? []).map((t: any) => ({
      candidate_id: data.candidate_id,
      test_id: t.id,
      is_open: data.is_open,
      reason: data.reason?.length ? data.reason : null,
      updated_by: context.userId,
    }));
    if (rows.length) {
      const { error } = await context.supabase
        .from("candidate_test_access")
        .upsert(rows, { onConflict: "candidate_id,test_id" });
      if (error) throw new Error(error.message);
    }
    await logAudit(context, data.is_open ? "test.access.open_all" : "test.access.close_all", "candidate", data.candidate_id, {
      count: rows.length,
      reason: data.reason ?? null,
    });
    return { ok: true, count: rows.length };
  });

const ReopenInput = z.object({
  candidate_id: z.string().uuid(),
  test_id: z.string().uuid(),
  clear_answers: z.boolean().default(true),
  reason: z.string().trim().max(300).optional().nullable(),
});

/**
 * Admin-only: ask a candidate to redo a test. The existing attempt is reset to
 * `in_progress` (previous score/result snapshotted into the audit trail) and
 * the test is re-opened for the candidate.
 */
export const reopenCandidateTest = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => ReopenInput.parse(d))
  .handler(async ({ context, data }) => {
    const { data: attempt } = await context.supabase
      .from("test_attempts")
      .select("id, status, score, result, started_at, finished_at")
      .eq("candidate_id", data.candidate_id)
      .eq("test_id", data.test_id)
      .maybeSingle();

    if (attempt) {
      if (data.clear_answers) {
        const del = await context.supabase.from("test_answers").delete().eq("attempt_id", attempt.id);
        if (del.error) throw new Error(del.error.message);
      }
      const upd = await context.supabase
        .from("test_attempts")
        .update({
          status: "in_progress",
          finished_at: null,
          score: null,
          result: null,
          started_at: new Date().toISOString(),
        })
        .eq("id", attempt.id);
      if (upd.error) throw new Error(upd.error.message);
    }

    const { data: prev } = await context.supabase
      .from("candidate_test_access")
      .select("retake_count")
      .eq("candidate_id", data.candidate_id)
      .eq("test_id", data.test_id)
      .maybeSingle();

    const { error } = await context.supabase.from("candidate_test_access").upsert(
      {
        candidate_id: data.candidate_id,
        test_id: data.test_id,
        is_open: true,
        reason: data.reason?.length ? data.reason : null,
        retake_count: ((prev?.retake_count as number) ?? 0) + 1,
        last_reopened_at: new Date().toISOString(),
        updated_by: context.userId,
      },
      { onConflict: "candidate_id,test_id" },
    );
    if (error) throw new Error(error.message);

    await logAudit(context, "test.attempt.reopen", "candidate", data.candidate_id, {
      test_id: data.test_id,
      attempt_id: attempt?.id ?? null,
      cleared_answers: data.clear_answers,
      previous_status: attempt?.status ?? null,
      previous_score: attempt?.score ?? null,
      reason: data.reason ?? null,
    });
    return { ok: true, reset: !!attempt };
  });

/* ---------------- Permintaan Ulang Test (HR mengajukan, Admin memutuskan) ---------------- */

/** Reset an attempt and (re)open the test for a candidate. Shared by reopen + approval. */
async function performReopen(
  context: any,
  candidate_id: string,
  test_id: string,
  clear_answers: boolean,
  reason: string | null,
) {
  const { data: attempt } = await context.supabase
    .from("test_attempts")
    .select("id, status, score")
    .eq("candidate_id", candidate_id)
    .eq("test_id", test_id)
    .maybeSingle();

  if (attempt) {
    if (clear_answers) {
      const del = await context.supabase.from("test_answers").delete().eq("attempt_id", attempt.id);
      if (del.error) throw new Error(del.error.message);
    }
    const upd = await context.supabase
      .from("test_attempts")
      .update({ status: "in_progress", finished_at: null, score: null, result: null, started_at: new Date().toISOString() })
      .eq("id", attempt.id);
    if (upd.error) throw new Error(upd.error.message);
  }

  const { data: prev } = await context.supabase
    .from("candidate_test_access")
    .select("retake_count")
    .eq("candidate_id", candidate_id)
    .eq("test_id", test_id)
    .maybeSingle();

  const { error } = await context.supabase.from("candidate_test_access").upsert(
    {
      candidate_id,
      test_id,
      is_open: true,
      reason: reason?.length ? reason : null,
      retake_count: ((prev?.retake_count as number) ?? 0) + 1,
      last_reopened_at: new Date().toISOString(),
      updated_by: context.userId,
    },
    { onConflict: "candidate_id,test_id" },
  );
  if (error) throw new Error(error.message);
  return { attempt_id: attempt?.id ?? null, previous_status: attempt?.status ?? null };
}

/** Staff (HR/Admin): ask Super Admin to let a candidate redo one test. */
export const requestCandidateRetake = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) =>
    z
      .object({
        candidate_id: z.string().uuid(),
        test_id: z.string().uuid(),
        reason: z.string().trim().max(300).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const existing = await context.supabase
      .from("candidate_retake_requests")
      .select("id")
      .eq("candidate_id", data.candidate_id)
      .eq("test_id", data.test_id)
      .eq("status", "pending")
      .maybeSingle();
    if (existing.data) throw new Error("Sudah ada permintaan yang menunggu persetujuan untuk test ini.");

    const { data: row, error } = await context.supabase
      .from("candidate_retake_requests")
      .insert({
        candidate_id: data.candidate_id,
        test_id: data.test_id,
        reason: data.reason?.length ? data.reason : null,
        requested_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await logAudit(context, "test.retake.request", "candidate", data.candidate_id, {
      test_id: data.test_id,
      request_id: row?.id ?? null,
      reason: data.reason ?? null,
    });
    return { ok: true, id: row?.id ?? null };
  });

/** Staff: list retake requests (default: pending first). */
export const listRetakeRequests = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) =>
    z.object({ status: z.enum(["pending", "approved", "rejected", "all"]).default("pending") }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("candidate_retake_requests")
      .select("*, candidates(id, full_name, code_snapshot), tests(id, code, name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { requests: rows ?? [], isAdmin: context.isAdmin };
  });

/** Admin-only: approve (reopen the test) or reject a retake request. */
export const decideRetakeRequest = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        approve: z.boolean(),
        clear_answers: z.boolean().default(true),
        note: z.string().trim().max(300).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: req, error: reqErr } = await context.supabase
      .from("candidate_retake_requests")
      .select("id, candidate_id, test_id, status, reason")
      .eq("id", data.id)
      .single();
    if (reqErr) throw new Error(reqErr.message);
    if (req.status !== "pending") throw new Error("Permintaan ini sudah diproses.");

    let reset: { attempt_id: string | null; previous_status: string | null } | null = null;
    if (data.approve) {
      reset = await performReopen(context, req.candidate_id, req.test_id, data.clear_answers, data.note ?? req.reason ?? null);
    }

    const { error } = await context.supabase
      .from("candidate_retake_requests")
      .update({
        status: data.approve ? "approved" : "rejected",
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
        decision_note: data.note?.length ? data.note : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await logAudit(context, data.approve ? "test.retake.approved" : "test.retake.rejected", "candidate", req.candidate_id, {
      request_id: req.id,
      test_id: req.test_id,
      cleared_answers: data.approve ? data.clear_answers : false,
      attempt_id: reset?.attempt_id ?? null,
      note: data.note ?? null,
    });
    return { ok: true };
  });

/* ---------------- Durasi / Waktu Pengerjaan Test (Admin & HR) ---------------- */

/** Staff-only: ubah durasi pengerjaan satu psikotest (menit). */
export const setTestDuration = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d) =>
    z
      .object({
        test_id: z.string().uuid(),
        duration_minutes: z.number().int().min(1).max(600),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: before } = await context.supabase
      .from("tests")
      .select("code, name, duration_minutes")
      .eq("id", data.test_id)
      .single();

    const { error } = await context.supabase
      .from("tests")
      .update({ duration_minutes: data.duration_minutes })
      .eq("id", data.test_id);
    if (error) throw new Error(error.message);

    await logAudit(context, "test.duration.update", "test", data.test_id, {
      code: before?.code ?? null,
      name: before?.name ?? null,
      from: before?.duration_minutes ?? null,
      to: data.duration_minutes,
    });
    return { ok: true, duration_minutes: data.duration_minutes };
  });
