import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/staff-middleware";
import { scoreTest } from "@/lib/test-scoring";
import { audienceMatches, candidateLevelOf, jobLevelOfPosition } from "@/lib/candidate-type";

/**
 * Fungsi bantu Super Admin / HR untuk mendampingi kandidat:
 * memperbaiki data diri, mengunggah berkas yang kurang, dan melengkapi
 * jawaban test yang belum terisi. Semua aksi dicatat ke audit log.
 */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function logAudit(
  ctx: { supabase: any; userId: string },
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
    console.error("audit_log_insert_failed", { action, error: (e as Error).message });
  }
}

const BiodataInput = z.object({
  id: z.string().uuid(),
  full_name: z.string().trim().max(120).nullish(),
  gender: z.enum(["Laki-laki", "Perempuan"]).nullish(),
  age: z.coerce.number().int().min(15).max(70).nullish(),
  school_name: z.string().trim().max(160).nullish(),
  education: z.string().trim().max(120).nullish(),
  major: z.string().trim().max(120).nullish(),
  phone: z.string().trim().max(30).nullish(),
  email: z.string().trim().max(200).nullish(),
  position_applied: z.string().trim().max(120).nullish(),
  work_experience: z.string().trim().max(120).nullish(),
  job_position: z.string().trim().max(60).nullish(),
  data_completed: z.boolean().optional(),
});

/** Perbaiki / lengkapi data diri kandidat dari dashboard staff. */
export const adminUpdateCandidateBiodata = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => BiodataInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = await admin();
    const { id, ...raw } = data;
    const update: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v === undefined) continue;
      update[k] = typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v;
    }
    if (typeof update["job_position"] === "string") {
      update["job_level"] = jobLevelOfPosition(update["job_position"] as string);
    }
    if (Object.keys(update).length === 0) return { ok: true, saved: [] };

    const { error } = await sb.from("candidates").update(update as any).eq("id", id);
    if (error) throw new Error(error.message);
    await logAudit(context, "candidate.biodata_edit", "candidate", id, {
      fields: Object.keys(update),
    });
    return { ok: true, saved: Object.keys(update) };
  });

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const ALLOWED_EXT = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);

const UploadInput = z.object({
  candidate_id: z.string().uuid(),
  file_type: z.enum(["ktp", "kk", "cv", "ijazah", "transkrip", "foto", "npwp"]),
  file_name: z.string().min(1).max(200),
  mime_type: z.string().max(120),
  file_size: z.number().int().nonnegative().max(MAX_UPLOAD_BYTES),
  base64: z
    .string()
    .min(1)
    .max(20 * 1024 * 1024),
});

/** Unggah berkas kandidat yang kurang atas nama staff (tercatat di riwayat versi). */
export const adminUploadCandidateFile = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => UploadInput.parse(d))
  .handler(async ({ context, data }) => {
    const mime = data.mime_type.toLowerCase().trim();
    if (!ALLOWED_MIME.has(mime)) {
      throw new Error("Tipe file tidak diizinkan. Hanya PDF, JPG, PNG, atau WEBP.");
    }
    const ext = (data.file_name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXT.has(ext)) throw new Error("Ekstensi file tidak diizinkan.");
    const buf = Buffer.from(data.base64, "base64");
    if (buf.length === 0) throw new Error("File kosong.");
    if (buf.length > MAX_UPLOAD_BYTES) throw new Error("Ukuran file maksimal 10MB.");

    const sb = await admin();
    const path = `${data.candidate_id}/${data.file_type}-${Date.now()}.${ext}`;
    const up = await sb.storage
      .from("candidate-files")
      .upload(path, buf, { contentType: data.mime_type, upsert: true });
    if (up.error) throw new Error(up.error.message);

    const { data: last } = await sb
      .from("candidate_file_versions")
      .select("version")
      .eq("candidate_id", data.candidate_id)
      .eq("file_type", data.file_type)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = ((last?.version as number | undefined) ?? 0) + 1;

    await sb
      .from("candidate_files")
      .delete()
      .eq("candidate_id", data.candidate_id)
      .eq("file_type", data.file_type);
    const { error } = await sb.from("candidate_files").insert({
      candidate_id: data.candidate_id,
      file_type: data.file_type,
      file_path: path,
      file_name: data.file_name,
      file_size: buf.length,
      mime_type: data.mime_type,
    });
    if (error) throw new Error(error.message);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", context.userId)
      .maybeSingle();
    const label = profile?.full_name || profile?.username || "Staff";

    await sb.from("candidate_file_versions").insert({
      candidate_id: data.candidate_id,
      file_type: data.file_type,
      version: nextVersion,
      file_path: path,
      file_name: data.file_name,
      file_size: buf.length,
      mime_type: data.mime_type,
      uploader_kind: "staff",
      uploader_id: context.userId,
      uploader_label: label,
    });

    await logAudit(context, "candidate.file_upload_staff", "candidate", data.candidate_id, {
      file_type: data.file_type,
      version: nextVersion,
    });
    return { ok: true, version: nextVersion };
  });

/**
 * Data pendamping pengisian: kandidat, daftar test yang berlaku untuk jalurnya,
 * plus status attempt masing-masing test.
 */
export const adminAssistOverview = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ candidate_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: cand, error } = await sb
      .from("candidates")
      .select("*, candidate_codes(code, candidate_type)")
      .eq("id", data.candidate_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cand) throw new Error("Kandidat tidak ditemukan.");

    const [{ data: tests }, { data: attempts }] = await Promise.all([
      sb.from("tests").select("*").eq("active", true).order("name"),
      sb
        .from("test_attempts")
        .select("id, test_id, status, score, started_at, finished_at")
        .eq("candidate_id", data.candidate_id),
    ]);

    const type = (cand as any).candidate_codes?.candidate_type ?? "karyawan";
    const level = candidateLevelOf(cand);
    const applicable = (tests ?? []).filter((t: any) =>
      audienceMatches(t.audience, type, level),
    );
    const attemptByTest = new Map((attempts ?? []).map((a: any) => [a.test_id, a]));
    return {
      candidate: cand,
      tests: applicable.map((t: any) => ({ ...t, attempt: attemptByTest.get(t.id) ?? null })),
    };
  });

/** Soal + jawaban tersimpan satu test untuk layar pendampingan. */
export const adminAssistTest = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z.object({ candidate_id: z.string().uuid(), test_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb = await admin();
    const [{ data: test }, { data: questions }, { data: attempt }] = await Promise.all([
      sb.from("tests").select("*").eq("id", data.test_id).maybeSingle(),
      sb
        .from("test_questions")
        .select("*")
        .eq("test_id", data.test_id)
        .eq("active", true)
        .order("question_number"),
      sb
        .from("test_attempts")
        .select("*")
        .eq("candidate_id", data.candidate_id)
        .eq("test_id", data.test_id)
        .maybeSingle(),
    ]);
    if (!test) throw new Error("Test tidak ditemukan.");
    let answers: any[] = [];
    if (attempt) {
      const { data: rows } = await sb
        .from("test_answers")
        .select("question_id, answer")
        .eq("attempt_id", (attempt as any).id);
      answers = rows ?? [];
    }
    await logAudit(context, "attempt.assist_open", "test_attempt", (attempt as any)?.id ?? null, {
      candidate_id: data.candidate_id,
      test_id: data.test_id,
    });
    return { test, questions: questions ?? [], attempt: attempt ?? null, answers };
  });

const SaveInput = z.object({
  candidate_id: z.string().uuid(),
  test_id: z.string().uuid(),
  answers: z.array(z.object({ question_id: z.string().uuid(), answer: z.string().max(4000) })),
  finalize: z.boolean().optional(),
});

/**
 * Simpan jawaban hasil pendampingan staff. Berlaku juga untuk attempt yang
 * SUDAH selesai: jawaban boleh diperbaiki/dikosongkan, dan skor otomatis
 * dihitung ulang memakai mesin skoring yang sama dengan submit kandidat.
 */
export const adminSaveAssistedAnswers = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => SaveInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = await admin();
    let { data: attempt } = await sb
      .from("test_attempts")
      .select("*")
      .eq("candidate_id", data.candidate_id)
      .eq("test_id", data.test_id)
      .maybeSingle();

    if (!attempt) {
      const ins = await sb
        .from("test_attempts")
        .insert({
          candidate_id: data.candidate_id,
          test_id: data.test_id,
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (ins.error) throw new Error(ins.error.message);
      attempt = ins.data;
    }
    const attemptId = (attempt as any).id as string;
    const wasFinished = (attempt as any).status === "finished";

    const filled = data.answers.filter((a) => (a.answer ?? "").trim() !== "");
    const cleared = data.answers
      .filter((a) => (a.answer ?? "").trim() === "")
      .map((a) => a.question_id);

    if (filled.length > 0) {
      const { error } = await sb
        .from("test_answers")
        .upsert(
          filled.map((a) => ({ attempt_id: attemptId, ...a })),
          { onConflict: "attempt_id,question_id" },
        );
      if (error) throw new Error(error.message);
    }
    if (cleared.length > 0) {
      await sb
        .from("test_answers")
        .delete()
        .eq("attempt_id", attemptId)
        .in("question_id", cleared);
    }

    // Attempt yang sudah selesai selalu dinilai ulang agar hasil konsisten.
    const shouldScore = data.finalize || wasFinished;
    let score: number | null = (attempt as any).score ?? null;
    if (shouldScore) {
      const [{ data: test }, { data: questions }, { data: saved }] = await Promise.all([
        sb.from("tests").select("*").eq("id", data.test_id).single(),
        sb.from("test_questions").select("*").eq("test_id", data.test_id),
        sb.from("test_answers").select("question_id, answer").eq("attempt_id", attemptId),
      ]);
      const allAnswers = (saved ?? []).map((a: any) => ({
        question_id: a.question_id,
        answer: a.answer ?? "",
      }));
      const scored = scoreTest(test, questions ?? [], allAnswers);
      score = scored.score;
      const upd = await sb
        .from("test_attempts")
        .update({
          status: "finished",
          finished_at: (attempt as any).finished_at ?? new Date().toISOString(),
          score: scored.score,
          result: scored.result,
        })
        .eq("id", attemptId);
      if (upd.error) throw new Error(upd.error.message);
    }

    await logAudit(context, "attempt.assist_save", "test_attempt", attemptId, {
      candidate_id: data.candidate_id,
      test_id: data.test_id,
      saved: filled.length,
      cleared: cleared.length,
      finalized: !!data.finalize,
      rescored_finished: wasFinished,
    });
    return {
      ok: true,
      attempt_id: attemptId,
      saved: filled.length,
      cleared: cleared.length,
      score,
      rescored: shouldScore,
    };
  });

/**
 * Buka kembali attempt yang sudah selesai supaya kandidat / Super Admin bisa
 * melengkapi soal yang terlewat. Skor lama dipertahankan sampai dinilai ulang.
 */
export const adminReopenAttempt = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z
      .object({
        candidate_id: z.string().uuid(),
        test_id: z.string().uuid(),
        reason: z.string().trim().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb = await admin();
    const { data: attempt } = await sb
      .from("test_attempts")
      .select("id, status")
      .eq("candidate_id", data.candidate_id)
      .eq("test_id", data.test_id)
      .maybeSingle();
    if (!attempt) throw new Error("Attempt belum ada untuk test ini.");

    const upd = await sb
      .from("test_attempts")
      .update({ status: "in_progress", finished_at: null })
      .eq("id", (attempt as any).id);
    if (upd.error) throw new Error(upd.error.message);

    await sb
      .from("candidate_test_access")
      .upsert(
        {
          candidate_id: data.candidate_id,
          test_id: data.test_id,
          is_open: true,
          reason: data.reason ?? "Dibuka kembali oleh Super Admin",
          last_reopened_at: new Date().toISOString(),
          updated_by: context.userId,
        },
        { onConflict: "candidate_id,test_id" },
      );

    await logAudit(context, "attempt.assist_reopen", "test_attempt", (attempt as any).id, {
      candidate_id: data.candidate_id,
      test_id: data.test_id,
      reason: data.reason ?? null,
    });
    return { ok: true, attempt_id: (attempt as any).id };
  });

