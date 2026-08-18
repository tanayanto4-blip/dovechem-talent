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

/**
 * Pusat monitoring live untuk Super Admin & HR:
 * siapa yang sedang online, test yang sedang berjalan (termasuk yang macet /
 * melewati durasi), kode terkunci di perangkat lain, dan insiden terbaru.
 */
export const liveMonitorOverview = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [codesRes, candRes, attemptsRes, incidentRes] = await Promise.all([
      supabaseAdmin
        .from("candidate_codes")
        .select(
          "id, code, candidate_name, candidate_type, active, expires_at, last_seen_at, active_device_token, active_device_at",
        )
        .order("last_seen_at", { ascending: false, nullsFirst: false })
        .limit(200),
      supabaseAdmin.from("candidates").select("id, code_id, full_name, job_level"),
      supabaseAdmin
        .from("test_attempts")
        .select("id, candidate_id, test_id, status, started_at, tests(name, duration_minutes)")
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("error_events")
        .select("id, occurred_at, source, message, actor_label, route, resolved")
        .like("source", "insiden:%")
        .order("occurred_at", { ascending: false })
        .limit(50),
    ]);

    const candidates = candRes.data ?? [];
    const byCodeId = new Map(candidates.map((c) => [c.code_id, c]));
    const byCandidateId = new Map(candidates.map((c) => [c.id, c]));

    const now = Date.now();
    const codes = (codesRes.data ?? []).map((c) => {
      const cand = c.id ? byCodeId.get(c.id) : undefined;
      const seen = c.last_seen_at ? new Date(c.last_seen_at).getTime() : 0;
      return {
        code_id: c.id,
        code: c.code,
        name: cand?.full_name ?? c.candidate_name,
        candidate_id: cand?.id ?? null,
        candidate_type: c.candidate_type,
        job_level: cand?.job_level ?? null,
        active: c.active,
        expires_at: c.expires_at,
        last_seen_at: c.last_seen_at,
        online: seen > 0 && now - seen < 30_000,
        device_locked: !!c.active_device_token,
        active_device_at: c.active_device_at,
      };
    });

    const running = (attemptsRes.data ?? []).map((a) => {
      const cand = byCandidateId.get(a.candidate_id);
      const test = a.tests as unknown as { name: string; duration_minutes: number } | null;
      const started = a.started_at ? new Date(a.started_at).getTime() : now;
      const elapsedMin = Math.floor((now - started) / 60_000);
      const duration = test?.duration_minutes ?? 0;
      return {
        attempt_id: a.id,
        candidate_id: a.candidate_id,
        test_id: a.test_id,
        candidate_name: cand?.full_name ?? "(tanpa nama)",
        test_name: test?.name ?? "Test",
        started_at: a.started_at,
        elapsed_minutes: elapsedMin,
        duration_minutes: duration,
        overdue: duration > 0 && elapsedMin > duration + 2,
      };
    });

    return {
      codes,
      running,
      incidents: incidentRes.data ?? [],
      summary: {
        online: codes.filter((c) => c.online).length,
        running: running.length,
        stuck: running.filter((r) => r.overdue).length,
        openIncidents: (incidentRes.data ?? []).filter((i) => !i.resolved).length,
      },
    };
  });

/**
 * Perbaikan cepat: lepaskan kunci perangkat pada kode kandidat sehingga
 * kandidat yang terlogout / ganti HP bisa masuk kembali seketika.
 */
export const resetCandidateDevice = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ code_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("candidate_codes")
      .update({ active_device_token: null, active_device_at: null })
      .eq("id", data.code_id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "candidate.device.reset",
      target_type: "candidate_code",
      target_id: data.code_id,
      metadata: {},
    });
    return { ok: true };
  });

/* ---------------- Auto-recovery kandidat (tindakan perbaikan terukur) ---------------- */

/** Ambang aman agar pemulihan tidak bentrok dengan pengerjaan yang masih wajar. */
const AUTO_RECOVERY = {
  /** Menit toleransi setelah durasi test habis sebelum dianggap macet. */
  overdueGraceMinutes: 5,
  /** Kandidat harus benar-benar tidak aktif (tidak terlihat online) selama ini. */
  idleMinutes: 3,
  /** Satu attempt hanya boleh dipulihkan otomatis sekali dalam rentang ini. */
  cooldownHours: 6,
  /** Batas jumlah tindakan per satu kali eksekusi. */
  maxActionsPerRun: 5,
  /** Kunci perangkat dilepas jika kandidat sudah lama tidak terlihat. */
  deviceIdleMinutes: 15,
};

/**
 * Menjalankan pemulihan otomatis untuk kandidat yang test-nya macet.
 *
 * Bersifat "terukur" dan aman terhadap histori:
 * - jawaban tidak pernah dihapus (clear_answers selalu false),
 * - attempt hanya dipulihkan jika sudah lewat durasi + masa tenggang dan
 *   kandidat tidak terlihat online (idle),
 * - satu attempt hanya dipulihkan sekali per periode cooldown (dicek dari
 *   audit_logs), sehingga tidak ada reset berulang yang merusak histori,
 * - jumlah tindakan dibatasi per eksekusi,
 * - setiap tindakan tercatat di audit_logs dengan actor_type "system".
 */
export const autoRecoverStuckCandidates = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({ dry_run: z.boolean().default(false) })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = Date.now();
    const actions: Array<{ kind: string; label: string; detail: string }> = [];
    const skipped: Array<{ label: string; reason: string }> = [];

    const [attemptsRes, codesRes, candRes] = await Promise.all([
      supabaseAdmin
        .from("test_attempts")
        .select("id, candidate_id, test_id, started_at, tests(name, duration_minutes)")
        .eq("status", "in_progress")
        .order("started_at", { ascending: true })
        .limit(200),
      supabaseAdmin
        .from("candidate_codes")
        .select("id, code, candidate_name, last_seen_at, active_device_token")
        .not("active_device_token", "is", null)
        .limit(200),
      supabaseAdmin.from("candidates").select("id, code_id, full_name"),
    ]);

    const candidates = candRes.data ?? [];
    const byCandidateId = new Map(candidates.map((c) => [c.id, c]));
    const codeByCodeId = new Map((codesRes.data ?? []).map((c) => [c.id, c]));
    const codeByCandidateId = new Map(
      candidates
        .map((c) => [c.id, c.code_id ? codeByCodeId.get(c.code_id) : undefined] as const)
        .filter(([, code]) => !!code),
    );

    const cooldownIso = new Date(now - AUTO_RECOVERY.cooldownHours * 3600_000).toISOString();
    const { data: recentAuto } = await supabaseAdmin
      .from("audit_logs")
      .select("metadata")
      .eq("action", "test.attempt.auto_recover")
      .gte("created_at", cooldownIso)
      .limit(500);
    const recoveredAttempts = new Set(
      (recentAuto ?? [])
        .map((r) => (r.metadata as Record<string, unknown> | null)?.["attempt_id"])
        .filter((v): v is string => typeof v === "string"),
    );

    for (const a of attemptsRes.data ?? []) {
      if (actions.length >= AUTO_RECOVERY.maxActionsPerRun) break;
      const cand = byCandidateId.get(a.candidate_id);
      const label = cand?.full_name ?? "(tanpa nama)";
      const test = a.tests as unknown as { name: string; duration_minutes: number } | null;
      const duration = test?.duration_minutes ?? 0;
      if (!duration) continue;
      const startedAt = a.started_at ? new Date(a.started_at).getTime() : now;
      const elapsedMin = Math.floor((now - startedAt) / 60_000);
      if (elapsedMin <= duration + AUTO_RECOVERY.overdueGraceMinutes) continue;

      const code = codeByCandidateId.get(a.candidate_id);
      const seen = code?.last_seen_at ? new Date(code.last_seen_at).getTime() : 0;
      const idleMin = seen ? Math.floor((now - seen) / 60_000) : Infinity;
      if (idleMin < AUTO_RECOVERY.idleMinutes) {
        skipped.push({ label, reason: "kandidat masih aktif — dibiarkan menyelesaikan test" });
        continue;
      }
      if (recoveredAttempts.has(a.id)) {
        skipped.push({ label, reason: "sudah dipulihkan otomatis, menunggu tindakan manual" });
        continue;
      }

      if (!data.dry_run) {
        const upd = await supabaseAdmin
          .from("test_attempts")
          .update({
            status: "in_progress",
            finished_at: null,
            started_at: new Date().toISOString(),
          })
          .eq("id", a.id)
          .eq("status", "in_progress");
        if (upd.error) {
          skipped.push({ label, reason: "gagal memperbarui attempt" });
          continue;
        }

        const { data: prev } = await supabaseAdmin
          .from("candidate_test_access")
          .select("retake_count")
          .eq("candidate_id", a.candidate_id)
          .eq("test_id", a.test_id)
          .maybeSingle();
        await supabaseAdmin.from("candidate_test_access").upsert(
          {
            candidate_id: a.candidate_id,
            test_id: a.test_id,
            is_open: true,
            reason: "Auto-recovery: test macet melewati durasi",
            retake_count: (prev?.retake_count ?? 0) as number,
            last_reopened_at: new Date().toISOString(),
            updated_by: context.userId,
          },
          { onConflict: "candidate_id,test_id" },
        );

        await supabaseAdmin.from("audit_logs").insert({
          actor_id: context.userId,
          actor_type: "system",
          actor_label: "Auto-recovery",
          action: "test.attempt.auto_recover",
          target_type: "candidate",
          target_id: a.candidate_id,
          metadata: {
            attempt_id: a.id,
            test_id: a.test_id,
            test_name: test?.name ?? null,
            elapsed_minutes: elapsedMin,
            duration_minutes: duration,
            idle_minutes: Number.isFinite(idleMin) ? idleMin : null,
            cleared_answers: false,
          },
        });
      }

      actions.push({
        kind: "reopen",
        label,
        detail: `Test "${test?.name ?? "Test"}" dibuka ulang (jawaban dipertahankan)`,
      });
    }

    // Lepas kunci perangkat untuk kandidat yang sudah lama tidak terlihat.
    for (const c of codesRes.data ?? []) {
      if (actions.length >= AUTO_RECOVERY.maxActionsPerRun) break;
      const seen = c.last_seen_at ? new Date(c.last_seen_at).getTime() : 0;
      const idleMin = seen ? Math.floor((now - seen) / 60_000) : Infinity;
      if (idleMin < AUTO_RECOVERY.deviceIdleMinutes) continue;

      if (!data.dry_run) {
        const { error } = await supabaseAdmin
          .from("candidate_codes")
          .update({ active_device_token: null, active_device_at: null })
          .eq("id", c.id);
        if (error) continue;
        await supabaseAdmin.from("audit_logs").insert({
          actor_id: context.userId,
          actor_type: "system",
          actor_label: "Auto-recovery",
          action: "candidate.device.auto_reset",
          target_type: "candidate_code",
          target_id: c.id,
          metadata: { code: c.code, idle_minutes: Number.isFinite(idleMin) ? idleMin : null },
        });
      }

      actions.push({
        kind: "device",
        label: c.candidate_name,
        detail: "Kunci perangkat dilepas otomatis (kandidat lama tidak aktif)",
      });
    }

    return { ran_at: new Date().toISOString(), dry_run: data.dry_run, actions, skipped };
  });
