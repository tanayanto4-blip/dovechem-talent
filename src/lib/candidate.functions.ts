import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { papiScore } from "@/lib/papi-key";


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

/**
 * Staff can close a specific test for a candidate (or re-open it for a retake).
 * Missing row = open by default. Throws when the test is closed.
 */
async function assertTestOpen(sb: any, candidateId: string, testId: string) {
  const { data } = await sb
    .from("candidate_test_access")
    .select("is_open, reason")
    .eq("candidate_id", candidateId)
    .eq("test_id", testId)
    .maybeSingle();
  if (data && data.is_open === false) {
    throw new Error(
      data.reason
        ? `Akses test ini ditutup oleh admin: ${data.reason}`
        : "Akses test ini sedang ditutup oleh admin.",
    );
  }
}

/** Candidate logs in with an access code. Returns candidate id + basic info. */
export const candidateLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => CodeInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    await resolveActiveCode(sb, data.code);
    const { data: codeRow, error } = await sb
      .from("candidate_codes")
      .select("id, code, candidate_name, candidate_email, position_applied, active, expires_at")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();
    if (error || !codeRow) throw new Error("Kode akses tidak ditemukan.");

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
    const codeRow = await resolveActiveCode(sb, data.code);
    const [candQ, filesQ, testsQ, attemptsQ] = await Promise.all([
      sb.from("candidates").select("*").eq("code_id", codeRow.id).single(),
      sb.from("candidate_files").select("*").eq("candidate_id", (await sb.from("candidates").select("id").eq("code_id", codeRow.id).single()).data?.id ?? ""),
      sb.from("tests").select("*").eq("active", true).order("code"),
      // Scores/results are staff-only: expose progress fields only.
      sb.from("test_attempts").select("id, test_id, status, started_at, finished_at").eq("candidate_id", (await sb.from("candidates").select("id").eq("code_id", codeRow.id).single()).data?.id ?? ""),
    ]);
    const candId = candQ.data?.id ?? "";
    const { data: access } = await sb
      .from("candidate_test_access")
      .select("test_id, is_open, reason, retake_count, last_reopened_at")
      .eq("candidate_id", candId);
    return {
      candidate: candQ.data,
      files: filesQ.data ?? [],
      tests: testsQ.data ?? [],
      attempts: attemptsQ.data ?? [],
      access: access ?? [],
    };
  });

const ProfileInput = z.object({
  code: z.string().trim().min(3),
  full_name: z.string().trim().min(2).max(120),
  school_name: z.string().trim().max(160).optional().nullable(),
  education: z.string().trim().max(120).optional().nullable(),
  major: z.string().trim().max(120).optional().nullable(),
  work_experience: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.union([z.string().email().max(200), z.literal("")]).optional().nullable(),
  position_applied: z.string().trim().max(120).optional().nullable(),
});

export const candidateSaveProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => ProfileInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const codeRow = await resolveActiveCode(sb, data.code);
    const { code: _c, ...rest } = data;
    const { error } = await sb.from("candidates").update({ ...rest, data_completed: true }).eq("code_id", codeRow.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const ALLOWED_EXT = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);

const UploadInput = z.object({
  code: z.string().trim().min(3),
  file_type: z.enum(["ktp", "kk", "cv", "ijazah", "transkrip", "foto", "npwp"]),
  file_name: z.string().min(1).max(200),
  mime_type: z.string().max(120),
  file_size: z.number().int().nonnegative().max(MAX_UPLOAD_BYTES),
  base64: z.string().min(1).max(20 * 1024 * 1024),
});

export const candidateUploadFile = createServerFn({ method: "POST" })
  .inputValidator((d) => UploadInput.parse(d))
  .handler(async ({ data }) => {
    if (data.file_size > MAX_UPLOAD_BYTES) throw new Error("Ukuran file maksimal 10MB.");
    const mime = data.mime_type.toLowerCase().trim();
    if (!ALLOWED_MIME.has(mime)) {
      throw new Error("Tipe file tidak diizinkan. Hanya PDF, JPG, PNG, atau WEBP.");
    }
    const ext = (data.file_name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      throw new Error("Ekstensi file tidak diizinkan.");
    }
    const buf = Buffer.from(data.base64, "base64");
    if (buf.length === 0) throw new Error("File kosong.");
    if (buf.length > MAX_UPLOAD_BYTES) throw new Error("Ukuran file maksimal 10MB.");
    if (Math.abs(buf.length - data.file_size) > 1024) {
      throw new Error("Ukuran file tidak sesuai dengan konten.");
    }
    const sb = await admin();
    const codeRow = await resolveActiveCode(sb, data.code);
    const { data: cand } = await sb.from("candidates").select("id").eq("code_id", codeRow.id).single();
    if (!cand) throw new Error("Kandidat tidak ditemukan.");
    const path = `${cand.id}/${data.file_type}-${Date.now()}.${ext}`;
    const up = await sb.storage.from("candidate-files").upload(path, buf, {
      contentType: data.mime_type,
      upsert: true,
    });
    if (up.error) throw new Error(up.error.message);
    // Compute next version number
    const { data: last } = await sb
      .from("candidate_file_versions")
      .select("version")
      .eq("candidate_id", cand.id)
      .eq("file_type", data.file_type)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = ((last?.version as number | undefined) ?? 0) + 1;

    // Update current pointer
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

    // Append to versions history
    await sb.from("candidate_file_versions").insert({
      candidate_id: cand.id,
      file_type: data.file_type,
      version: nextVersion,
      file_path: path,
      file_name: data.file_name,
      file_size: data.file_size,
      mime_type: data.mime_type,
      uploader_kind: "candidate",
      uploader_label: `Kandidat (${data.code})`,
    });
    return { ok: true, path, version: nextVersion };
  });

const StartTestInput = z.object({ code: z.string().min(3), test_id: z.string().uuid() });
export const candidateStartTest = createServerFn({ method: "POST" })
  .inputValidator((d) => StartTestInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const codeRow = await resolveActiveCode(sb, data.code);
    const { data: cand } = await sb.from("candidates").select("id, data_completed").eq("code_id", codeRow.id).single();
    if (!cand) throw new Error("Kandidat tidak ditemukan.");
    if (!cand.data_completed) throw new Error("Lengkapi data diri terlebih dahulu.");
    await assertTestOpen(sb, cand.id, data.test_id);

    let { data: attempt } = await sb.from("test_attempts").select("*").eq("candidate_id", cand.id).eq("test_id", data.test_id).maybeSingle();
    if (!attempt) {
      const ins = await sb.from("test_attempts").insert({ candidate_id: cand.id, test_id: data.test_id }).select().single();
      if (ins.error) throw new Error(ins.error.message);
      attempt = ins.data;
    }
    const [test, questions, answers] = await Promise.all([
      sb.from("tests").select("*").eq("id", data.test_id).single(),
      sb.from("test_questions").select("id, question_number, question_text, options, dimension").eq("test_id", data.test_id).eq("active", true).order("question_number"),
      sb.from("test_answers").select("question_id, answer").eq("attempt_id", (attempt as any).id),
    ]);
    return { attempt, test: test.data, questions: questions.data ?? [], answers: answers.data ?? [] };
  });

const SaveAnswerInput = z.object({
  code: z.string().min(3),
  attempt_id: z.string().uuid(),
  question_id: z.string().uuid(),
  answer: z.string().max(500),
});
/** Autosave a single answer. Rejects if the attempt is already finished. */
export const candidateSaveAnswer = createServerFn({ method: "POST" })
  .inputValidator((d) => SaveAnswerInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const codeRow = await resolveActiveCode(sb, data.code);
    const { data: cand } = await sb.from("candidates").select("id").eq("code_id", codeRow.id).single();
    if (!cand) throw new Error("Kandidat tidak ditemukan.");
    const { data: attempt } = await sb
      .from("test_attempts")
      .select("id, status, test_id")
      .eq("id", data.attempt_id)
      .eq("candidate_id", cand.id)
      .single();
    if (!attempt) throw new Error("Attempt tidak valid.");
    if ((attempt as any).status === "finished") throw new Error("Attempt sudah selesai.");
    await assertTestOpen(sb, cand.id, (attempt as any).test_id);
    const { error } = await sb
      .from("test_answers")
      .upsert(
        { attempt_id: data.attempt_id, question_id: data.question_id, answer: data.answer },
        { onConflict: "attempt_id,question_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const AttemptInput = z.object({ code: z.string().min(3), attempt_id: z.string().uuid() });
/**
 * Candidate-facing attempt view. Scoring output (score / result payload) is
 * intentionally NEVER returned here: psikotest results are visible to HR/Admin
 * only. Candidates may only confirm that their attempt is recorded.
 */
export const candidateGetAttempt = createServerFn({ method: "POST" })
  .inputValidator((d) => AttemptInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const codeRow = await resolveActiveCode(sb, data.code);
    const { data: cand } = await sb.from("candidates").select("id").eq("code_id", codeRow.id).single();
    if (!cand) throw new Error("Kandidat tidak ditemukan.");
    const { data: attempt, error } = await sb
      .from("test_attempts")
      .select("id, candidate_id, test_id, status, started_at, finished_at, tests(id, code, name, test_type, duration_minutes)")
      .eq("id", data.attempt_id)
      .eq("candidate_id", cand.id)
      .single();
    if (error) throw new Error(error.message);
    return { attempt };
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
    const codeRow = await resolveActiveCode(sb, data.code);
    const { data: cand } = await sb.from("candidates").select("id").eq("code_id", codeRow.id).single();
    if (!cand) throw new Error("Kandidat tidak ditemukan.");
    const { data: attempt } = await sb.from("test_attempts").select("*, tests(*)").eq("id", data.attempt_id).eq("candidate_id", cand.id).single();
    if (!attempt) throw new Error("Attempt tidak valid.");
    await assertTestOpen(sb, cand.id, (attempt as any).test_id);
    // Idempotent: repeat submits are a no-op. Scoring output is never returned
    // to the candidate — results are staff-only.
    if (attempt.status === "finished") {
      return { ok: true, idempotent: true };
    }


    // Persist answers idempotently. Upsert on (attempt_id, question_id) so a
    // retried submit for the same attempt cannot create duplicate rows, and
    // delete any prior rows whose questions are no longer in the payload.
    const questionIds = data.answers.map((a) => a.question_id);
    if (questionIds.length > 0) {
      const del = await sb
        .from("test_answers")
        .delete()
        .eq("attempt_id", data.attempt_id)
        .not("question_id", "in", `(${questionIds.map((id) => `"${id}"`).join(",")})`);
      if (del.error) throw new Error(del.error.message);
      const { error } = await sb
        .from("test_answers")
        .upsert(
          data.answers.map((a) => ({ attempt_id: data.attempt_id, ...a })),
          { onConflict: "attempt_id,question_id" },
        );
      if (error) throw new Error(error.message);
    } else {
      const del = await sb.from("test_answers").delete().eq("attempt_id", data.attempt_id);
      if (del.error) throw new Error(del.error.message);
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
    } else if (test.test_type === "mbti") {
      // Forced-choice: each option carries a dimension letter (E/I, S/N, T/F, J/P).
      const counts: Record<string, number> = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
      const qMap = new Map((qs.data ?? []).map((q: any) => [q.id, q]));
      for (const a of data.answers) {
        const q: any = qMap.get(a.question_id);
        const opt = (q?.options ?? []).find((o: any) => o.key === a.answer);
        const dim = opt?.dimension;
        if (dim && counts[dim] !== undefined) counts[dim]++;
      }
      const pick = (x: string, y: string) => (counts[x] >= counts[y] ? x : y);
      const type = `${pick("E", "I")}${pick("S", "N")}${pick("T", "F")}${pick("J", "P")}`;
      const pairs = {
        EI: { E: counts.E, I: counts.I },
        SN: { S: counts.S, N: counts.N },
        TF: { T: counts.T, F: counts.F },
        JP: { J: counts.J, P: counts.P },
      };
      // Score = average clarity of the dominant letter in each pair (0-100).
      const clarity = (a: number, b: number) => (a + b === 0 ? 0 : Math.round((Math.max(a, b) / (a + b)) * 100));
      const clarityByPair = {
        EI: clarity(counts.E, counts.I),
        SN: clarity(counts.S, counts.N),
        TF: clarity(counts.T, counts.F),
        JP: clarity(counts.J, counts.P),
      };
      score = Math.round((clarityByPair.EI + clarityByPair.SN + clarityByPair.TF + clarityByPair.JP) / 4);
      result = { type, counts, pairs, clarity: clarityByPair };
    } else if (test.test_type === "eq") {
      // Likert 1..5 per item; group by dimension (SA/ME/MO/EM/SS).
      const dims = ["SA", "ME", "MO", "EM", "SS"] as const;
      const sums: Record<string, number> = { SA: 0, ME: 0, MO: 0, EM: 0, SS: 0 };
      const counts: Record<string, number> = { SA: 0, ME: 0, MO: 0, EM: 0, SS: 0 };
      const qMap = new Map((qs.data ?? []).map((q: any) => [q.id, q]));
      for (const a of data.answers) {
        const q: any = qMap.get(a.question_id);
        const dim = q?.dimension;
        const val = parseInt(a.answer, 10);
        if (dim && sums[dim] !== undefined && !Number.isNaN(val) && val >= 1 && val <= 5) {
          sums[dim] += val;
          counts[dim] += 1;
        }
      }
      // Per-dimension score normalized to 0-100 (max = count * 5)
      const perDim: Record<string, { raw: number; max: number; percent: number }> = {} as any;
      let totalPct = 0; let dimsWithData = 0;
      for (const d of dims) {
        const max = counts[d] * 5;
        const pct = max > 0 ? Math.round((sums[d] / max) * 100) : 0;
        perDim[d] = { raw: sums[d], max, percent: pct };
        if (max > 0) { totalPct += pct; dimsWithData++; }
      }
      score = dimsWithData > 0 ? Math.round(totalPct / dimsWithData) : 0;
      const dominant = (Object.entries(perDim).sort((a, b) => b[1].percent - a[1].percent)[0] ?? ["SA", { percent: 0 }])[0];
      result = { perDim, dominant, sums, counts };
    } else if (test.test_type === "wpt") {
      // WPT: jawaban bebas — tidak ada auto-scoring; menunggu review manual HR.
      const answered = data.answers.filter((a) => (a.answer ?? "").trim() !== "").length;
      const total = (qs.data ?? []).length || 50;
      score = 0;
      result = { requires_manual_review: true, answered, total, unanswered: total - answered };
    } else if (test.test_type === "papi") {
      // PAPI Kostick: forced-choice A/B. Skor dihitung dengan kunci lembar jawaban resmi
      // (opsi A = panah atas, opsi B = panah bawah) -> 20 skala, masing-masing maks 9.
      const qMap = new Map((qs.data ?? []).map((q: any) => [q.id, q]));
      const picks: Record<number, string> = {};
      for (const a of data.answers) {
        const key = (a.answer ?? "").trim().toUpperCase();
        if (key !== "A" && key !== "B") continue;
        const q: any = qMap.get(a.question_id);
        if (q?.question_number) picks[q.question_number] = key;
      }
      const papi = papiScore(picks);
      const total = (qs.data ?? []).length || 90;
      score = 0;
      result = {
        requires_manual_review: true,
        answered: papi.answered,
        total,
        unanswered: total - papi.answered,
        scales: papi.scales,
        roles: papi.top,
        needs: papi.bottom,
        highest: papi.highest,
        picks,
      };

    } else if (test.test_type === "pauli") {
      // Pauli/Koran: kunci dihitung dari deret angka (jumlah dua angka bersebelahan, ambil digit terakhir).
      const byId = new Map((qs.data ?? []).map((q: any) => [q.id, q]));
      let attempted = 0;
      let correct = 0;
      const perColumn: Array<{ column: number; attempted: number; correct: number }> = [];
      for (const a of data.answers) {
        const q: any = byId.get(a.question_id);
        const digits: string = (q?.options as any)?.digits ?? "";
        if (!digits) continue;
        const chars = (a.answer ?? "").split("");
        let cAtt = 0;
        let cCor = 0;
        for (let i = 0; i < digits.length - 1; i++) {
          const ch = chars[i];
          if (!ch || !/\d/.test(ch)) continue;
          cAtt++;
          const key = (Number(digits[i]) + Number(digits[i + 1])) % 10;
          if (Number(ch) === key) cCor++;
        }
        attempted += cAtt;
        correct += cCor;
        perColumn.push({ column: q?.question_number ?? 0, attempted: cAtt, correct: cCor });
      }
      perColumn.sort((x, y) => x.column - y.column);
      const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
      score = accuracy;
      result = { attempted, correct, wrong: attempted - correct, accuracy, perColumn };
    }

    const finishedAt = new Date().toISOString();
    const upd = await sb.from("test_attempts").update({
      status: "finished",
      finished_at: finishedAt,
      score,
      result,
    }).eq("id", data.attempt_id);
    if (upd.error) throw new Error(upd.error.message);

    // Audit: candidate submission (no auth user; use candidate context).
    try {
      const { data: candMeta } = await sb
        .from("candidates")
        .select("full_name, candidate_codes(code)")
        .eq("id", cand.id)
        .maybeSingle();
      const label = (candMeta as any)?.candidate_codes?.code
        ? `${(candMeta as any)?.full_name ?? "Kandidat"} (${(candMeta as any)?.candidate_codes?.code})`
        : (candMeta as any)?.full_name ?? "Kandidat";
      await sb.from("audit_logs").insert({
        actor_id: null,
        actor_type: "candidate",
        actor_label: label,
        action: "attempt.submit",
        target_type: "test_attempt",
        target_id: data.attempt_id,
        metadata: {
          candidate_id: cand.id,
          test_id: test.id,
          test_name: test.name,
          test_type: test.test_type,
          score,
          finished_at: finishedAt,
        },
      });
    } catch (e) {
      console.error("audit_log_insert_failed", { action: "attempt.submit", error: (e as Error).message });
    }

    // Score/result stay server-side: only HR/Admin may view psikotest results.
    return { ok: true };
  });


/**
 * Intro screen before a test starts: returns test metadata plus the spoken
 * instruction configured by staff. Does NOT create an attempt, so the timer
 * only begins once the candidate presses "Mulai".
 */
export const candidateGetTestIntro = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().trim().min(3).max(64), test_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const codeRow = await resolveActiveCode(sb, data.code);
    const { data: cand } = await sb.from("candidates").select("id, data_completed").eq("code_id", codeRow.id).single();
    if (!cand) throw new Error("Kandidat tidak ditemukan.");
    const { data: test, error } = await sb
      .from("tests")
      .select("id, code, name, description, test_type, duration_minutes, voice_instruction, voice_enabled, voice_lang, voice_rate, voice_autoplay, voice_mode, voice_audio_path, voice_audio_name, voice_audio_mime")
      .eq("id", data.test_id)
      .single();
    if (error || !test) throw new Error("Test tidak ditemukan.");
    const { data: attempt } = await sb
      .from("test_attempts")
      .select("id, status")
      .eq("candidate_id", cand.id)
      .eq("test_id", data.test_id)
      .maybeSingle();
    // Signed URL for the recorded audio instruction (private bucket).
    let voice_audio_url: string | null = null;
    if ((test as any).voice_audio_path) {
      const { data: signed } = await sb.storage
        .from("voice-instructions")
        .createSignedUrl((test as any).voice_audio_path, 60 * 60);
      voice_audio_url = signed?.signedUrl ?? null;
    }
    await assertTestOpen(sb, cand.id, data.test_id);
    return {
      test: { ...test, voice_audio_url },
      resumed: !!attempt && attempt.status !== "finished",
      data_completed: cand.data_completed,
    };
  });
