import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CodeInput = z.object({ code: z.string().trim().min(3).max(64) });

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Look up a candidate code and enforce active + not-expired. Returns {id}. */
async function resolveActiveCode(sb: any, code: string) {
  const { data: row, error } = await sb
    .from("candidate_codes")
    .select("id, active, expires_at")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Kode akses tidak ditemukan.");
  if (!row.active) throw new Error("Kode akses sudah dinonaktifkan.");
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    throw new Error("Kode akses sudah melewati masa berlaku.");
  }
  return row as { id: string; active: boolean; expires_at: string | null };
}

/** Candidate logs in with an access code. Returns candidate id + basic info. */
export const candidateLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => CodeInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: codeRow, error } = await sb
      .from("candidate_codes")
      .select("id, code, candidate_name, candidate_email, position_applied, active")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!codeRow) throw new Error("Kode akses tidak ditemukan.");
    if (!codeRow.active) throw new Error("Kode akses sudah dinonaktifkan.");

    // upsert candidate row
    let { data: cand } = await sb
      .from("candidates")
      .select("*")
      .eq("code_id", codeRow.id)
      .maybeSingle();
    if (!cand) {
      const ins = await sb
        .from("candidates")
        .insert({
          code_id: codeRow.id,
          full_name: codeRow.candidate_name,
          email: codeRow.candidate_email,
          position_applied: codeRow.position_applied,
        })
        .select("*")
        .single();
      if (ins.error) throw new Error(ins.error.message);
      cand = ins.data;
      await sb.from("candidate_codes").update({ used_at: new Date().toISOString() }).eq("id", codeRow.id);
    }
    return { candidate: cand, code: codeRow.code };
  });

export const candidateGetProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => CodeInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: codeRow } = await sb.from("candidate_codes").select("id").eq("code", data.code.toUpperCase()).maybeSingle();
    if (!codeRow) throw new Error("Kode tidak valid.");
    const [candQ, filesQ, testsQ, attemptsQ] = await Promise.all([
      sb.from("candidates").select("*").eq("code_id", codeRow.id).single(),
      sb.from("candidate_files").select("*").eq("candidate_id", (await sb.from("candidates").select("id").eq("code_id", codeRow.id).single()).data?.id ?? ""),
      sb.from("tests").select("*").eq("active", true).order("code"),
      sb.from("test_attempts").select("*").eq("candidate_id", (await sb.from("candidates").select("id").eq("code_id", codeRow.id).single()).data?.id ?? ""),
    ]);
    return { candidate: candQ.data, files: filesQ.data ?? [], tests: testsQ.data ?? [], attempts: attemptsQ.data ?? [] };
  });

const ProfileInput = z.object({
  code: z.string().trim().min(3),
  full_name: z.string().trim().min(2).max(120),
  nik: z.string().trim().min(6).max(32),
  birth_place: z.string().trim().max(80).optional().nullable(),
  birth_date: z.string().optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
  position_applied: z.string().max(120).optional().nullable(),
  education: z.string().max(120).optional().nullable(),
  marital_status: z.string().max(30).optional().nullable(),
});

export const candidateSaveProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => ProfileInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: codeRow } = await sb.from("candidate_codes").select("id").eq("code", data.code.toUpperCase()).maybeSingle();
    if (!codeRow) throw new Error("Kode tidak valid.");
    const { code: _c, ...rest } = data;
    const { error } = await sb.from("candidates").update({ ...rest, data_completed: true }).eq("code_id", codeRow.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UploadInput = z.object({
  code: z.string().trim().min(3),
  file_type: z.enum(["ktp", "kk", "cv", "ijazah", "transkrip", "foto", "npwp"]),
  file_name: z.string().min(1).max(200),
  mime_type: z.string().max(120),
  file_size: z.number().int().nonnegative(),
  base64: z.string().min(1),
});

export const candidateUploadFile = createServerFn({ method: "POST" })
  .inputValidator((d) => UploadInput.parse(d))
  .handler(async ({ data }) => {
    if (data.file_size > 10 * 1024 * 1024) throw new Error("Ukuran file maksimal 10MB.");
    const sb = await admin();
    const { data: codeRow } = await sb.from("candidate_codes").select("id").eq("code", data.code.toUpperCase()).maybeSingle();
    if (!codeRow) throw new Error("Kode tidak valid.");
    const { data: cand } = await sb.from("candidates").select("id").eq("code_id", codeRow.id).single();
    if (!cand) throw new Error("Kandidat tidak ditemukan.");
    const buf = Buffer.from(data.base64, "base64");
    const ext = data.file_name.split(".").pop() || "bin";
    const path = `${cand.id}/${data.file_type}-${Date.now()}.${ext}`;
    const up = await sb.storage.from("candidate-files").upload(path, buf, {
      contentType: data.mime_type,
      upsert: true,
    });
    if (up.error) throw new Error(up.error.message);
    // delete old row of same type, insert new
    await sb.from("candidate_files").delete().eq("candidate_id", cand.id).eq("file_type", data.file_type);
    const { error } = await sb.from("candidate_files").insert({
      candidate_id: cand.id,
      file_type: data.file_type,
      file_path: path,
      file_name: data.file_name,
      file_size: data.file_size,
      mime_type: data.mime_type,
    });
    if (error) throw new Error(error.message);
    return { ok: true, path };
  });

const StartTestInput = z.object({ code: z.string().min(3), test_id: z.string().uuid() });
export const candidateStartTest = createServerFn({ method: "POST" })
  .inputValidator((d) => StartTestInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: codeRow } = await sb.from("candidate_codes").select("id").eq("code", data.code.toUpperCase()).maybeSingle();
    if (!codeRow) throw new Error("Kode tidak valid.");
    const { data: cand } = await sb.from("candidates").select("id, data_completed").eq("code_id", codeRow.id).single();
    if (!cand) throw new Error("Kandidat tidak ditemukan.");
    if (!cand.data_completed) throw new Error("Lengkapi data diri terlebih dahulu.");

    let { data: attempt } = await sb.from("test_attempts").select("*").eq("candidate_id", cand.id).eq("test_id", data.test_id).maybeSingle();
    if (!attempt) {
      const ins = await sb.from("test_attempts").insert({ candidate_id: cand.id, test_id: data.test_id }).select().single();
      if (ins.error) throw new Error(ins.error.message);
      attempt = ins.data;
    }
    const [test, questions] = await Promise.all([
      sb.from("tests").select("*").eq("id", data.test_id).single(),
      sb.from("test_questions").select("id, question_number, question_text, options, dimension").eq("test_id", data.test_id).order("question_number"),
    ]);
    return { attempt, test: test.data, questions: questions.data ?? [] };
  });

const AttemptInput = z.object({ code: z.string().min(3), attempt_id: z.string().uuid() });
export const candidateGetAttempt = createServerFn({ method: "POST" })
  .inputValidator((d) => AttemptInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: codeRow } = await sb.from("candidate_codes").select("id").eq("code", data.code.toUpperCase()).maybeSingle();
    if (!codeRow) throw new Error("Kode tidak valid.");
    const { data: cand } = await sb.from("candidates").select("id").eq("code_id", codeRow.id).single();
    if (!cand) throw new Error("Kandidat tidak ditemukan.");
    const { data: attempt, error } = await sb
      .from("test_attempts")
      .select("*, tests(*), test_answers(*)")
      .eq("id", data.attempt_id)
      .eq("candidate_id", cand.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: questions } = await sb
      .from("test_questions")
      .select("*")
      .eq("test_id", (attempt as any).test_id)
      .order("question_number");
    return { attempt, questions: questions ?? [] };
  });

const SubmitTestInput = z.object({
  code: z.string().min(3),
  attempt_id: z.string().uuid(),
  answers: z.array(z.object({ question_id: z.string().uuid(), answer: z.string().max(500) })),
});
export const candidateSubmitTest = createServerFn({ method: "POST" })
  .inputValidator((d) => SubmitTestInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: codeRow } = await sb.from("candidate_codes").select("id").eq("code", data.code.toUpperCase()).maybeSingle();
    if (!codeRow) throw new Error("Kode tidak valid.");
    const { data: cand } = await sb.from("candidates").select("id").eq("code_id", codeRow.id).single();
    if (!cand) throw new Error("Kandidat tidak ditemukan.");
    const { data: attempt } = await sb.from("test_attempts").select("*, tests(*)").eq("id", data.attempt_id).eq("candidate_id", cand.id).single();
    if (!attempt) throw new Error("Attempt tidak valid.");
    if (attempt.status === "finished") throw new Error("Test sudah selesai.");

    // persist answers
    await sb.from("test_answers").delete().eq("attempt_id", data.attempt_id);
    if (data.answers.length > 0) {
      const { error } = await sb.from("test_answers").insert(data.answers.map((a) => ({ attempt_id: data.attempt_id, ...a })));
      if (error) throw new Error(error.message);
    }

    // scoring
    const test = (attempt as any).tests;
    const qs = await sb.from("test_questions").select("*").eq("test_id", test.id);
    let score = 0;
    let result: any = {};
    if (test.test_type === "mcq") {
      const map = new Map(data.answers.map((a) => [a.question_id, a.answer]));
      let correct = 0;
      for (const q of qs.data ?? []) if (map.get(q.id) === q.correct_answer) correct++;
      const total = (qs.data ?? []).length || 1;
      score = Math.round((correct / total) * 100);
      result = { correct, total };
    } else if (test.test_type === "disc") {
      const most: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
      const least: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
      for (const a of data.answers) {
        try {
          const v = JSON.parse(a.answer);
          if (v && most[v.most] !== undefined) most[v.most]++;
          if (v && least[v.least] !== undefined) least[v.least]++;
        } catch { /* legacy single-letter answer */
          if (most[a.answer] !== undefined) most[a.answer]++;
        }
      }
      const change: Record<string, number> = {
        D: most.D - least.D, I: most.I - least.I, S: most.S - least.S, C: most.C - least.C,
      };
      const dominant = (Object.entries(most).sort((a, b) => b[1] - a[1])[0] ?? ["D", 0])[0];
      const totalGroups = (qs.data ?? []).length || 24;
      score = Math.round((most[dominant] / totalGroups) * 100);
      result = { most, least, change, dominant };
    } else if (test.test_type === "kraepelin") {
      // answers are numeric strings; score = correctness rate provided by client-side check
      const map = new Map(data.answers.map((a) => [a.question_id, a.answer]));
      let correct = 0;
      for (const q of qs.data ?? []) if (map.get(q.id) === q.correct_answer) correct++;
      const total = (qs.data ?? []).length || 1;
      score = Math.round((correct / total) * 100);
      result = { correct, total };
    }

    const upd = await sb.from("test_attempts").update({
      status: "finished",
      finished_at: new Date().toISOString(),
      score,
      result,
    }).eq("id", data.attempt_id);
    if (upd.error) throw new Error(upd.error.message);
    return { ok: true, score, result };
  });
