import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
});

function randomCode() {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "DOV-";
  for (let i = 0; i < 6; i++) s += alpha[Math.floor(Math.random() * alpha.length)];
  return s;
}

export const createCandidateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { code: row };
  });

export const listCandidateCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("candidate_codes")
      .select("*, candidates(id, data_completed, updated_at)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { codes: data ?? [] };
  });

export const toggleCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("candidate_codes").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("candidate_codes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("candidates")
      .select("*, candidate_codes(code, active), candidate_files(id, file_type), test_attempts(id, score, status, tests(name, test_type))")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { candidates: data ?? [] };
  });

export const getCandidateDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ path: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: signed, error } = await context.supabase.storage.from("candidate-files").createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const dashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
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
