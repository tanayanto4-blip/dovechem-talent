import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { scoreTest } from "@/lib/test-scoring";
import { DEVICE_CONFLICT_MESSAGE } from "@/lib/candidate-session";
import {
  audiencesFor,
  candidateLevelOf,
  jobLevelOfPosition,
  JOB_POSITIONS,
} from "@/lib/candidate-type";

const CodeInput = z.object({
  code: z.string().trim().min(3).max(64),
  device: z.string().trim().max(128).optional(),
});

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Log perubahan posisi jabatan/tingkat kandidat ke audit trail. */
async function logCandidateLevelChange(
  sb: any,
  candidateId: string,
  from: { job_position?: string | null; job_level?: string | null },
  to: { job_position?: string | null; job_level?: string | null },
) {
  try {
    const { data: meta } = await sb
      .from("candidates")
      .select("full_name, candidate_codes(code)", { count: "exact" })
      .eq("id", candidateId)
      .maybeSingle();
    const label = meta?.full_name
      ? `${meta.full_name} (${meta.candidate_codes?.code ?? "-"})`
      : `Kandidat ${candidateId}`;
    await sb.from("audit_logs").insert({
      actor_id: null,
      actor_type: "candidate",
      actor_label: label,
      action: "candidate.level_change",
      target_type: "candidate",
      target_id: candidateId,
      metadata: {
        from_job_position: from.job_position ?? null,
        from_job_level: from.job_level ?? null,
        to_job_position: to.job_position ?? null,
        to_job_level: to.job_level ?? null,
      },
    });
  } catch (e) {
    console.error("audit_log_insert_failed", {
      action: "candidate.level_change",
      error: (e as Error).message,
    });
  }
}

/**
 * Look up a candidate code and enforce active + not-expired + single device.
 * Every candidate request carries the device token minted at login; if the
 * stored token differs, another device took over the code and this session is
 * rejected (the client then logs out automatically).
 */
async function resolveActiveCode(sb: any, code: string, device?: string) {
  const { data: row, error } = await sb
    .from("candidate_codes")
    .select("id, active, expires_at, active_device_token, candidate_type")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Kode akses tidak ditemukan.");
  if (!row.active) throw new Error("Kode akses sudah dinonaktifkan.");
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    // Otomatis nonaktifkan kode yang kedaluwarsa begitu terdeteksi.
    await sb.from("candidate_codes").update({ active: false }).eq("id", row.id);
    throw new Error("Kode akses sudah melewati masa berlaku.");
  }
  if (row.active_device_token && device && row.active_device_token !== device) {
    throw new Error(DEVICE_CONFLICT_MESSAGE);
  }
  return row as { id: string; active: boolean; expires_at: string | null; candidate_type: string };
}

/**
 * Kandidat tidak boleh melihat identitas asli test (DISC, MBTI, WPT, dst.) —
 * baik di layar maupun di payload jaringan. Semua endpoint kandidat memakai
 * helper ini agar nama, kode, dan deskripsi asli diganti label generik
 * "TEST 1", "TEST 2", ... sesuai urutan test aktif (order by code).
 *
 * Urutan dihitung per jalur kandidat (magang / karyawan) karena paket testnya
 * berbeda — nomor test harus runtut untuk masing-masing jalur.
 */
async function activeTestOrder(sb: any, type: string, level?: string | null): Promise<string[]> {
  const { data } = await sb
    .from("tests")
    .select("id, audience")
    .eq("active", true)
    .in("audience", audiencesFor(type, level))
    .order("code");
  return ((data ?? []) as { id: string }[]).map((t) => t.id);
}

function maskTest<T extends { id: string }>(test: T, order: string[]): T {
  const idx = order.indexOf(test.id);
  const label = idx >= 0 ? `TEST ${idx + 1}` : "TEST";
  return {
    ...test,
    name: label,
    code: label.replace(/\s+/g, "-"),
    description: null,
  } as T;
}

/**
 * Paket test berbeda per jalur kandidat (magang / karyawan). Test yang tidak
 * diperuntukkan bagi jalur kandidat ini tidak boleh dibuka walaupun ID-nya
 * ditebak.
 */
async function assertTestForType(sb: any, testId: string, type: string, level?: string | null) {
  const { data } = await sb.from("tests").select("audience").eq("id", testId).maybeSingle();
  const audience = (data?.audience as string | undefined) ?? "both";
  if (!audiencesFor(type, level).includes(audience)) {
    throw new Error("Test ini tidak diperuntukkan bagi jalur kandidat Anda.");
  }
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

/**
 * Tambahan waktu (menit) yang diberikan Super Admin / HR untuk satu test milik
 * satu kandidat. Nilai ini ditambahkan ke durasi standar test.
 */
async function extraTimeFor(
  sb: any,
  candidateId: string,
  testId: string,
): Promise<{ minutes: number; grantedMs: number }> {
  const { data } = await sb
    .from("candidate_test_access")
    .select("extra_minutes, extra_time_granted_at")
    .eq("candidate_id", candidateId)
    .eq("test_id", testId)
    .maybeSingle();
  const n = Number((data as any)?.extra_minutes);
  const g = (data as any)?.extra_time_granted_at
    ? new Date((data as any).extra_time_granted_at).getTime()
    : NaN;
  return {
    minutes: Number.isFinite(n) && n > 0 ? n : 0,
    grantedMs: Number.isFinite(g) ? g : NaN,
  };
}

async function extraMinutesFor(sb: any, candidateId: string, testId: string): Promise<number> {
  return (await extraTimeFor(sb, candidateId, testId)).minutes;
}

/**
 * Batas akhir pengerjaan (epoch ms). Jika tambahan waktu diberikan SETELAH
 * waktu asli habis, hitung mundur dimulai dari saat tambahan diberikan supaya
 * kandidat benar-benar bisa melanjutkan, bukan langsung habis lagi.
 */
function deadlineMsFor(
  startedMs: number,
  baseMinutes: number,
  extra: { minutes: number; grantedMs: number },
): number {
  const base = startedMs + baseMinutes * 60_000;
  if (extra.minutes <= 0) return base;
  const anchor = Number.isFinite(extra.grantedMs) ? Math.max(base, extra.grantedMs) : base;
  return anchor + extra.minutes * 60_000;
}


/**
 * Resolve (or auto-create) the candidate row for an access code.
 * A brand-new code has no candidate row yet, and duplicates can appear if two
 * tabs log in at once — both cases previously threw "Kandidat tidak ditemukan"
 * on every candidate page. This heals both.
 */
async function ensureCandidate(sb: any, codeId: string) {
  const { data: rows, error } = await sb
    .from("candidates")
    .select("*")
    .eq("code_id", codeId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw new Error(error.message);
  if (rows && rows.length) return rows[0];

  const { data: codeRow } = await sb
    .from("candidate_codes")
    .select("candidate_name, candidate_email, position_applied")
    .eq("id", codeId)
    .maybeSingle();

  const ins = await sb
    .from("candidates")
    .insert({
      code_id: codeId,
      full_name: codeRow?.candidate_name ?? null,
      email: codeRow?.candidate_email ?? null,
      position_applied: codeRow?.position_applied ?? null,
    })
    .select("*")
    .single();
  if (ins.error) {
    // Lost an insert race: re-read instead of failing the page.
    const retry = await sb.from("candidates").select("*").eq("code_id", codeId).limit(1);
    if (retry.data && retry.data.length) return retry.data[0];
    throw new Error(ins.error.message);
  }
  return ins.data;
}

/** Candidate logs in with an access code. Returns candidate id + basic info. */
export const candidateLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => CodeInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    // Login intentionally skips the device check: a new login always wins and
    // takes over the code, forcing the previously logged-in device out.
    await resolveActiveCode(sb, data.code);
    const { data: codeRow, error } = await sb
      .from("candidate_codes")
      .select(
        "id, code, candidate_name, candidate_email, position_applied, active, expires_at, candidate_type",
      )
      .eq("code", data.code.toUpperCase())
      .maybeSingle();
    if (error || !codeRow) throw new Error("Kode akses tidak ditemukan.");

    const cand = await ensureCandidate(sb, codeRow.id);
    const device = crypto.randomUUID();
    await sb
      .from("candidate_codes")
      .update({
        active_device_token: device,
        active_device_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        ...((codeRow as any).used_at ? {} : { used_at: new Date().toISOString() }),
      })
      .eq("id", codeRow.id);

    return {
      candidate: cand,
      code: codeRow.code,
      device,
      candidate_type: (codeRow as any).candidate_type ?? "karyawan",
      job_level: candidateLevelOf(cand),
    };
  });

export const candidateGetProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => CodeInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const codeRow = await resolveActiveCode(sb, data.code, (data as any).device);
    const cand = await ensureCandidate(sb, codeRow.id);
    const [filesQ, testsQ, attemptsQ, accessQ] = await Promise.all([
      sb.from("candidate_files").select("*").eq("candidate_id", cand.id),
      sb
        .from("tests")
        .select("*")
        .eq("active", true)
        .in("audience", audiencesFor(codeRow.candidate_type, candidateLevelOf(cand)))
        .order("code"),
      // Scores/results are staff-only: expose progress fields only.
      sb
        .from("test_attempts")
        .select("id, test_id, status, started_at, finished_at")
        .eq("candidate_id", cand.id),
      sb
        .from("candidate_test_access")
        .select("test_id, is_open, reason, retake_count, last_reopened_at")
        .eq("candidate_id", cand.id),
    ]);
    const files = filesQ.data ?? [];
    const fotoRow = (files as any[]).find((f) => f.file_type === "foto");
    let foto_url: string | null = null;
    if (fotoRow?.file_path) {
      const { data: signed } = await sb.storage
        .from("candidate-files")
        .createSignedUrl(fotoRow.file_path, 60 * 60);
      foto_url = signed?.signedUrl ?? null;
    }
    return {
      candidate: cand,
      candidate_type: codeRow.candidate_type ?? "karyawan",
      job_level: candidateLevelOf(cand),
      files,
      foto_url,

      tests: ((testsQ.data ?? []) as any[]).map((t, _i, all) =>
        maskTest(
          t,
          all.map((x: any) => x.id),
        ),
      ),
      attempts: attemptsQ.data ?? [],
      access: accessQ.data ?? [],
    };
  });

/**
 * Heartbeat sesi kandidat. Tidak pernah throw supaya pesan tidak tertelan /
 * tersamarkan oleh transport error — client cukup membaca `status`.
 */
export const candidateSessionStatus = createServerFn({ method: "POST" })
  .inputValidator((d) => CodeInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: row } = await sb
      .from("candidate_codes")
      .select("active, expires_at, active_device_token")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();
    if (!row) return { status: "invalid" as const, message: "Kode akses tidak ditemukan." };
    if (!row.active)
      return { status: "invalid" as const, message: "Kode akses sudah dinonaktifkan." };
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      // Otomatis nonaktifkan kode yang kedaluwarsa begitu terdeteksi.
      await sb
        .from("candidate_codes")
        .update({ active: false })
        .eq("code", data.code.toUpperCase());
      return { status: "invalid" as const, message: "Kode akses sudah melewati masa berlaku." };
    }
    // Token berbeda (atau sesi lama tanpa token) = kode dipakai perangkat lain.
    if (row.active_device_token && row.active_device_token !== (data.device ?? "")) {
      return { status: "conflict" as const, message: DEVICE_CONFLICT_MESSAGE };
    }
    // Presence: heartbeat ini dipanggil tiap 5 detik selama kandidat membuka
    // portal, jadi last_seen_at = penanda online/offline di dashboard staff.
    await sb
      .from("candidate_codes")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("code", data.code.toUpperCase());
    return { status: "ok" as const, message: "" };
  });

const WORK_EXPERIENCE_VALUES = new Set([
  "Belum bekerja",
  ...Array.from({ length: 21 }, (_, i) => String(i)),
]);
const WorkExperienceSchema = z
  .string()
  .trim()
  .refine((v) => WORK_EXPERIENCE_VALUES.has(v), {
    message: "Pengalaman kerja harus salah satu pilihan yang tersedia",
  });

const ProfileInput = z.object({
  code: z.string().trim().min(3),
  device: z.string().trim().max(128).optional(),
  full_name: z.string().trim().min(2, "Nama lengkap wajib diisi").max(120),
  school_name: z.string().trim().min(2, "Nama sekolah/universitas wajib diisi").max(160),
  gender: z.enum(["Laki-laki", "Perempuan"], { message: "Jenis kelamin wajib dipilih" }),
  education: z.string().trim().min(1, "Pendidikan wajib dipilih").max(120),
  major: z.string().trim().min(1, "Jurusan wajib diisi").max(120),
  work_experience: WorkExperienceSchema.optional(),
  age: z.coerce.number().int().min(15, "Usia wajib dipilih").max(70),
  phone: z.string().trim().min(6, "Nomor telepon wajib diisi").max(30),
  email: z.string().trim().email("Email tidak valid").max(200),
  position_applied: z.string().trim().min(2, "Posisi yang dilamar wajib diisi").max(120),
  job_position: z.string().trim().max(60).optional(),
});

export const candidateSaveProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => ProfileInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const codeRow = await resolveActiveCode(sb, data.code, (data as any).device);
    const { code: _c, device: _d, ...rest } = data;
    // Field wajib berbeda per jalur: magang cukup biodata dasar, karyawan
    // mengisi lama pengalaman kerja dan posisi jabatan.
    let level: string | null = null;
    if (codeRow.candidate_type === "magang") {
      delete (rest as any).work_experience;
      delete (rest as any).job_position;
    } else {
      if (!rest.work_experience?.trim()) throw new Error("Pengalaman kerja wajib dipilih.");
      // Posisi jabatan menentukan tingkat (Staff / Senior Staff) dan porsi soal.
      level = jobLevelOfPosition(rest.job_position ?? null);
      if (!level) {
        throw new Error(
          `Posisi jabatan wajib dipilih: ${JOB_POSITIONS.map((p) => p.value).join(", ")}.`,
        );
      }
    }
    const candidate = await ensureCandidate(sb, codeRow.id);
    const { error } = await sb
      .from("candidates")
      .update({ ...rest, ...(level ? { job_level: level } : {}), data_completed: true })
      .eq("code_id", codeRow.id);
    if (error) throw new Error(error.message);
    if (codeRow.candidate_type !== "magang" && level) {
      const levelChanged =
        candidate.job_position !== rest.job_position || candidate.job_level !== level;
      if (levelChanged) {
        await logCandidateLevelChange(
          sb,
          candidate.id,
          { job_position: candidate.job_position, job_level: candidate.job_level },
          { job_position: rest.job_position, job_level: level },
        );
      }
    }
    return { ok: true };
  });

const ProfileAutosaveInput = z.object({
  code: z.string().trim().min(3),
  device: z.string().trim().max(128).optional(),
  full_name: z.string().trim().max(120).optional(),
  school_name: z.string().trim().max(160).optional(),
  gender: z.enum(["Laki-laki", "Perempuan"]).optional(),
  education: z.string().trim().max(120).optional(),
  major: z.string().trim().max(120).optional(),
  work_experience: WorkExperienceSchema.optional(),
  age: z.coerce.number().int().min(15).max(70).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email("Email tidak valid").max(200).optional(),
  position_applied: z.string().trim().max(120).optional(),
  job_position: z.string().trim().max(60).optional(),
});

export const candidateAutosaveProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => ProfileAutosaveInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const codeRow = await resolveActiveCode(sb, data.code, (data as any).device);
    const candidate = await ensureCandidate(sb, codeRow.id);
    const { code: _c, device: _d, ...raw } = data;
    const update: any = {};
    if (raw.full_name?.trim()) update.full_name = raw.full_name.trim();
    if (raw.gender) update.gender = raw.gender;
    if (raw.school_name?.trim()) update.school_name = raw.school_name.trim();
    if (raw.education?.trim()) update.education = raw.education.trim();
    if (raw.major?.trim()) update.major = raw.major.trim();
    if (raw.work_experience?.trim()) update.work_experience = raw.work_experience.trim();
    if (raw.age != null) update.age = raw.age;
    if (raw.phone?.trim()) update.phone = raw.phone.trim();
    if (raw.email?.trim()) update.email = raw.email.trim();
    if (raw.position_applied?.trim()) update.position_applied = raw.position_applied.trim();
    let levelChanged = false;
    if (raw.job_position?.trim() && jobLevelOfPosition(raw.job_position)) {
      update.job_position = raw.job_position.trim();
      update.job_level = jobLevelOfPosition(raw.job_position);
      levelChanged =
        candidate.job_position !== update.job_position || candidate.job_level !== update.job_level;
    }
    if (Object.keys(update).length === 0) return { ok: true, saved: [] };
    const { error } = await sb.from("candidates").update(update).eq("code_id", codeRow.id);
    if (error) throw new Error(error.message);
    if (levelChanged) {
      await logCandidateLevelChange(
        sb,
        candidate.id,
        { job_position: candidate.job_position, job_level: candidate.job_level },
        { job_position: update.job_position, job_level: update.job_level },
      );
    }
    return { ok: true, saved: Object.keys(update) };
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
  device: z.string().trim().max(128).optional(),
  file_type: z.enum(["ktp", "kk", "cv", "ijazah", "transkrip", "foto", "npwp"]),
  file_name: z.string().min(1).max(200),
  mime_type: z.string().max(120),
  file_size: z.number().int().nonnegative().max(MAX_UPLOAD_BYTES),
  base64: z
    .string()
    .min(1)
    .max(20 * 1024 * 1024),
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
    const codeRow = await resolveActiveCode(sb, data.code, (data as any).device);
    const cand = await ensureCandidate(sb, codeRow.id);
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
    await sb
      .from("candidate_files")
      .delete()
      .eq("candidate_id", cand.id)
      .eq("file_type", data.file_type);
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

const StartTestInput = z.object({
  code: z.string().min(3),
  device: z.string().trim().max(128).optional(),
  test_id: z.string().uuid(),
});
export const candidateStartTest = createServerFn({ method: "POST" })
  .inputValidator((d) => StartTestInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const codeRow = await resolveActiveCode(sb, data.code, (data as any).device);
    const cand = await ensureCandidate(sb, codeRow.id);
    if (!cand) throw new Error("Kandidat tidak ditemukan.");
    if (!cand.data_completed) throw new Error("Lengkapi data diri terlebih dahulu.");

    let { data: attempt } = await sb
      .from("test_attempts")
      .select("*")
      .eq("candidate_id", cand.id)
      .eq("test_id", data.test_id)
      .maybeSingle();
    // Izinkan melanjutkan attempt yang sudah ada meskipun tingkat jabatan
    // berubah setelah test dimulai, agar tidak ada error di histori test.
    if (!attempt) {
      await assertTestForType(sb, data.test_id, codeRow.candidate_type, candidateLevelOf(cand));
    }
    await assertTestOpen(sb, cand.id, data.test_id);

    if (!attempt) {
      const ins = await sb
        .from("test_attempts")
        .insert({
          candidate_id: cand.id,
          test_id: data.test_id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (ins.error) throw new Error(ins.error.message);
      attempt = ins.data;
    } else if (!(attempt as any).started_at && (attempt as any).status !== "finished") {
      // Test ulang: waktu baru mulai dihitung sekarang, saat kandidat membuka test.
      const upd = await sb
        .from("test_attempts")
        .update({ started_at: new Date().toISOString() })
        .eq("id", (attempt as any).id)
        .eq("candidate_id", cand.id)
        .select()
        .single();
      if (upd.error) throw new Error(upd.error.message);
      attempt = upd.data;
    }
    const [test, questions, answers] = await Promise.all([
      sb.from("tests").select("*").eq("id", data.test_id).single(),
      sb
        .from("test_questions")
        .select("id, question_number, question_text, options, dimension")
        .eq("test_id", data.test_id)
        .eq("active", true)
        .order("question_number"),
      sb
        .from("test_answers")
        .select("question_id, answer")
        .eq("attempt_id", (attempt as any).id),
    ]);
    const maskedTest = test.data
      ? maskTest(
          test.data as any,
          await activeTestOrder(sb, codeRow.candidate_type, candidateLevelOf(cand)),
        )
      : test.data;
    // Auto-lock: an in-progress attempt whose allotted duration has elapsed can
    // no longer be worked on. The client finalises it immediately (late submits
    // are scored from answers autosaved before the deadline).
    const extra = await extraTimeFor(sb, cand.id, data.test_id);
    const baseMin = Number((test.data as any)?.duration_minutes) || 0;
    const startedMs = (attempt as any)?.started_at
      ? new Date((attempt as any).started_at).getTime()
      : NaN;
    const deadlineMs =
      baseMin > 0 && Number.isFinite(startedMs)
        ? deadlineMsFor(startedMs, baseMin, extra)
        : NaN;
    const expired =
      (attempt as any)?.status !== "finished" &&
      Number.isFinite(deadlineMs) &&
      Date.now() > deadlineMs;
    // server_now lets the client compute the countdown against the server clock
    // instead of the device clock (a skewed device clock would either expire the
    // test instantly or hand out extra time).
    return {
      attempt,
      test: maskedTest,
      questions: questions.data ?? [],
      answers: answers.data ?? [],
      expired,
      extra_minutes: extra.minutes,
      deadline_at: Number.isFinite(deadlineMs) ? new Date(deadlineMs).toISOString() : null,
      gender: (cand as any).gender ?? null,
      server_now: new Date().toISOString(),
    };

  });

const SaveAnswerInput = z.object({
  code: z.string().min(3),
  device: z.string().trim().max(128).optional(),
  attempt_id: z.string().uuid(),
  question_id: z.string().uuid(),
  answer: z.string().max(500),
});
/** Autosave a single answer. Rejects if the attempt is already finished. */
export const candidateSaveAnswer = createServerFn({ method: "POST" })
  .inputValidator((d) => SaveAnswerInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const codeRow = await resolveActiveCode(sb, data.code, (data as any).device);
    const cand = await ensureCandidate(sb, codeRow.id);
    if (!cand) throw new Error("Kandidat tidak ditemukan.");
    const { data: attempt } = await sb
      .from("test_attempts")
      .select("id, status, test_id, started_at, tests(duration_minutes)")
      .eq("id", data.attempt_id)
      .eq("candidate_id", cand.id)
      .single();
    if (!attempt) throw new Error("Attempt tidak valid.");
    if ((attempt as any).status === "finished") throw new Error("Attempt sudah selesai.");
    // Server-side time limit: reject autosaves after the allotted duration.
    const dur = Number((attempt as any).tests?.duration_minutes) || 0;
    const extraSave = await extraTimeFor(sb, cand.id, (attempt as any).test_id);
    const start = (attempt as any).started_at
      ? new Date((attempt as any).started_at).getTime()
      : NaN;
    if (
      dur > 0 &&
      Number.isFinite(start) &&
      Date.now() > deadlineMsFor(start, dur, extraSave) + 60_000
    ) {
      throw new Error("Waktu pengerjaan test sudah habis.");
    }
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

const AttemptInput = z.object({
  code: z.string().min(3),
  device: z.string().trim().max(128).optional(),
  attempt_id: z.string().uuid(),
});
/**
 * Candidate-facing attempt view. Scoring output (score / result payload) is
 * intentionally NEVER returned here: psikotest results are visible to HR/Admin
 * only. Candidates may only confirm that their attempt is recorded.
 */
export const candidateGetAttempt = createServerFn({ method: "POST" })
  .inputValidator((d) => AttemptInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const codeRow = await resolveActiveCode(sb, data.code, (data as any).device);
    const cand = await ensureCandidate(sb, codeRow.id);
    if (!cand) throw new Error("Kandidat tidak ditemukan.");
    const { data: attempt, error } = await sb
      .from("test_attempts")
      .select(
        "id, candidate_id, test_id, status, started_at, finished_at, tests(id, code, name, test_type, duration_minutes)",
      )
      .eq("id", data.attempt_id)
      .eq("candidate_id", cand.id)
      .single();
    if (error) throw new Error(error.message);
    const order = await activeTestOrder(sb, codeRow.candidate_type, candidateLevelOf(cand));
    const masked =
      attempt && (attempt as any).tests
        ? { ...attempt, tests: maskTest((attempt as any).tests, order) }
        : attempt;
    return { attempt: masked };
  });

const SubmitTestInput = z.object({
  code: z.string().min(3),
  device: z.string().trim().max(128).optional(),
  attempt_id: z.string().uuid(),
  answers: z.array(z.object({ question_id: z.string().uuid(), answer: z.string().max(500) })),
});
export const candidateSubmitTest = createServerFn({ method: "POST" })
  .inputValidator((d) => SubmitTestInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const codeRow = await resolveActiveCode(sb, data.code, (data as any).device);
    const cand = await ensureCandidate(sb, codeRow.id);
    if (!cand) throw new Error("Kandidat tidak ditemukan.");
    const { data: attempt } = await sb
      .from("test_attempts")
      .select("*, tests(*)")
      .eq("id", data.attempt_id)
      .eq("candidate_id", cand.id)
      .single();
    if (!attempt) throw new Error("Attempt tidak valid.");
    await assertTestOpen(sb, cand.id, (attempt as any).test_id);
    // Idempotent: repeat submits are a no-op. Scoring output is never returned
    // to the candidate — results are staff-only.
    if (attempt.status === "finished") {
      return { ok: true, idempotent: true };
    }

    // Server-side time limit enforcement. The client countdown is advisory only;
    // a candidate could call this function directly after the deadline. Late
    // submits are accepted only as a "finish" action: the payload answers are
    // discarded and scoring uses whatever was autosaved before the deadline.
    const testRow = (attempt as any).tests;
    const durationMinutes =
      (Number(testRow?.duration_minutes) || 0) +
      (await extraMinutesFor(sb, cand.id, (attempt as any).test_id));
    const startedAt = (attempt as any).started_at
      ? new Date((attempt as any).started_at).getTime()
      : NaN;
    const GRACE_MS = 60_000; // tolerate clock skew / in-flight submit
    const isLate =
      durationMinutes > 0 &&
      Number.isFinite(startedAt) &&
      Date.now() > startedAt + durationMinutes * 60_000 + GRACE_MS;

    let answers = data.answers;

    if (isLate) {
      // Ignore the payload entirely; re-read the answers persisted before the deadline.
      const saved = await sb
        .from("test_answers")
        .select("question_id, answer")
        .eq("attempt_id", data.attempt_id);
      if (saved.error) throw new Error(saved.error.message);
      answers = (saved.data ?? []).map((a: any) => ({
        question_id: a.question_id,
        answer: a.answer ?? "",
      }));
    } else {
      // Persist answers idempotently. Upsert on (attempt_id, question_id) so a
      // retried submit for the same attempt cannot create duplicate rows, and
      // delete any prior rows whose questions are no longer in the payload.
      const questionIds = answers.map((a) => a.question_id);
      if (questionIds.length > 0) {
        const del = await sb
          .from("test_answers")
          .delete()
          .eq("attempt_id", data.attempt_id)
          .not("question_id", "in", `(${questionIds.map((id) => `"${id}"`).join(",")})`);
        if (del.error) throw new Error(del.error.message);
        const { error } = await sb.from("test_answers").upsert(
          answers.map((a) => ({ attempt_id: data.attempt_id, ...a })),
          { onConflict: "attempt_id,question_id" },
        );
        if (error) throw new Error(error.message);
      } else {
        const del = await sb.from("test_answers").delete().eq("attempt_id", data.attempt_id);
        if (del.error) throw new Error(del.error.message);
      }
    }

    // scoring
    const test = testRow;
    const qs = await sb.from("test_questions").select("*").eq("test_id", test.id);

    const { score, result } = scoreTest(test, qs.data ?? [], answers);

    const finishedAt = new Date().toISOString();
    const upd = await sb
      .from("test_attempts")
      .update({
        status: "finished",
        finished_at: finishedAt,
        score,
        result,
      })
      .eq("id", data.attempt_id);
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
        : ((candMeta as any)?.full_name ?? "Kandidat");
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
      console.error("audit_log_insert_failed", {
        action: "attempt.submit",
        error: (e as Error).message,
      });
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
  .inputValidator((d) =>
    z
      .object({
        code: z.string().trim().min(3).max(64),
        device: z.string().trim().max(128).optional(),
        test_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    const codeRow = await resolveActiveCode(sb, data.code, (data as any).device);
    const cand = await ensureCandidate(sb, codeRow.id);
    if (!cand) throw new Error("Kandidat tidak ditemukan.");
    const { data: test, error } = await sb
      .from("tests")
      .select(
        "id, code, name, description, test_type, duration_minutes, voice_instruction, voice_enabled, voice_lang, voice_rate, voice_autoplay, voice_mode, voice_audio_path, voice_audio_name, voice_audio_mime",
      )
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
    await assertTestForType(sb, data.test_id, codeRow.candidate_type, candidateLevelOf(cand));
    await assertTestOpen(sb, cand.id, data.test_id);
    return {
      test: {
        ...maskTest(
          test as any,
          await activeTestOrder(sb, codeRow.candidate_type, candidateLevelOf(cand)),
        ),
        voice_audio_url,
      },
      resumed: !!attempt && attempt.status !== "finished",
      data_completed: cand.data_completed,
    };
  });
