/**
 * Audit-log integration coverage.
 *
 * Two admin/candidate write paths must always produce an `audit_logs` row:
 *
 *   1. `logStaffAccess` (called from `src/routes/admin.tsx` on every admin
 *      area visit) → `action = 'admin.access'`, `target_type = 'area'`,
 *      `actor_type = 'staff'`, and `metadata.area` set to the current segment.
 *
 *   2. `candidateSubmitTest` (in `src/lib/candidate.functions.ts`) →
 *      `action = 'attempt.submit'`, `target_type = 'test_attempt'`,
 *      `target_id = attempt_id`, `actor_type = 'candidate'`, `actor_label`
 *      derived from the candidate name + code, and `metadata` including
 *      `candidate_id`, `test_id`, `test_name`, `test_type`, `score`, and
 *      `finished_at`.
 *
 * Layer 1 (static) locks the source so the wiring above cannot regress.
 * Layer 2 (runtime, env-gated) exercises the live endpoints and reads
 * `audit_logs` back to prove a new row is persisted with a fresh timestamp
 * and the expected shape.
 *
 * Env for the runtime block:
 *   INTEGRATION_BASE_URL              e.g. https://test-dovechem.lovable.app
 *   INTEGRATION_SUPABASE_URL          Supabase project URL
 *   INTEGRATION_SERVICE_ROLE_KEY      Service role key (server-only; used
 *                                     only to READ audit_logs for assertions)
 *   INTEGRATION_STAFF_EMAIL           Staff account able to sign in
 *   INTEGRATION_STAFF_PASSWORD        Password for that account
 *   INTEGRATION_CANDIDATE_CODE        Active candidate code (data completed)
 *   INTEGRATION_TEST_ID               Test id the candidate can attempt
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const adminSrc = readFileSync(resolve(here, "../admin.functions.ts"), "utf8");
const candSrc = readFileSync(resolve(here, "../candidate.functions.ts"), "utf8");
const adminRouteSrc = readFileSync(
  resolve(here, "../../routes/admin.tsx"),
  "utf8",
);

function extractHandler(src: string, name: string): string {
  const startRe = new RegExp(`export const ${name}\\s*=\\s*createServerFn`);
  const start = src.search(startRe);
  if (start < 0) throw new Error(`handler ${name} not found`);
  const rest = src.slice(start + 1);
  const nextIdx = rest.search(/\nexport const \w+\s*=\s*createServerFn/);
  return nextIdx < 0 ? src.slice(start) : src.slice(start, start + 1 + nextIdx);
}

// ---------- 1. Static guarantees ----------

describe("audit logging — static guarantees", () => {
  it("logStaffAccess writes an audit_logs row with staff actor + area metadata", () => {
    const body = extractHandler(adminSrc, "logStaffAccess");
    // Middleware gate
    expect(body).toMatch(/\.middleware\(\[\s*requireStaff\s*\]\)/);
    // Validates the area input
    expect(body).toMatch(/area:\s*z\.string\(\)[\s\S]{0,80}\.min\(1\)/);
    // Emits the audit call with the right action / target_type / metadata
    expect(body).toMatch(/logAudit\(\s*context\s*,\s*["']admin\.access["']\s*,\s*["']area["']\s*,\s*null\s*,\s*\{\s*area:\s*data\.area\s*\}\s*\)/);
  });

  it("logAudit sets actor_id from ctx.userId and actor_type='staff'", () => {
    // The shared helper is the sole writer for staff audit rows.
    expect(adminSrc).toMatch(/from\(["']audit_logs["']\)\.insert\(\{[\s\S]*actor_id:\s*ctx\.userId[\s\S]*actor_type:\s*["']staff["'][\s\S]*action[\s\S]*target_type[\s\S]*target_id[\s\S]*metadata[\s\S]*\}\)/);
  });

  it("admin layout calls logStaffAccess for every distinct admin area visited", () => {
    // Route file wires per-area logging via useEffect, keyed by pathname.
    expect(adminRouteSrc).toMatch(/const logAccess\s*=\s*useServerFn\(logStaffAccess\)/);
    expect(adminRouteSrc).toMatch(/logAccess\(\{\s*data:\s*\{\s*area:\s*seg\s*\}\s*\}\)/);
    // Derives the current area segment from the pathname (not a hardcoded value).
    expect(adminRouteSrc).toMatch(/pathname\.replace\(\/\^\\\/admin/);
    // useEffect depends on pathname so each navigation re-runs the check.
    expect(adminRouteSrc).toMatch(/useEffect\(\(\)\s*=>\s*\{[\s\S]*logAccess\([\s\S]*\}\s*,\s*\[pathname,\s*logAccess\]\)/);
  });

  it("candidateSubmitTest writes an audit_logs row with the expected shape", () => {
    const body = extractHandler(candSrc, "candidateSubmitTest");
    expect(body).toMatch(/from\(["']audit_logs["']\)\.insert\(\{[\s\S]*action:\s*["']attempt\.submit["']/);
    expect(body).toMatch(/target_type:\s*["']test_attempt["']/);
    expect(body).toMatch(/target_id:\s*data\.attempt_id/);
    expect(body).toMatch(/actor_type:\s*["']candidate["']/);
    expect(body).toMatch(/actor_label:\s*label/);
    // Metadata contains the fields required by the audit UI + reports.
    for (const key of [
      /candidate_id:\s*cand\.id/,
      /test_id:\s*test\.id/,
      /test_name:\s*test\.name/,
      /test_type:\s*test\.test_type/,
      /score,/,
      /finished_at:\s*finishedAt/,
    ]) expect(body).toMatch(key);
  });

  it("candidateSubmitTest computes finished_at as an ISO timestamp used both on the attempt and the audit row", () => {
    const body = extractHandler(candSrc, "candidateSubmitTest");
    expect(body).toMatch(/const finishedAt\s*=\s*new Date\(\)\.toISOString\(\)/);
    // Same value used to update the attempt and to stamp the audit metadata.
    const finishedRefs = body.match(/finishedAt/g) ?? [];
    expect(finishedRefs.length).toBeGreaterThanOrEqual(3);
  });

  it("audit writes are wrapped in try/catch so the primary action never fails on log errors", () => {
    // Staff helper
    expect(adminSrc).toMatch(/try\s*\{[\s\S]*audit_logs["']\)\.insert[\s\S]*\}\s*catch/);
    // Candidate submit
    const body = extractHandler(candSrc, "candidateSubmitTest");
    expect(body).toMatch(/try\s*\{[\s\S]*audit_logs["']\)\.insert[\s\S]*\}\s*catch/);
  });
});

// ---------- 2. Runtime end-to-end (env-gated) ----------

const BASE = process.env.INTEGRATION_BASE_URL;
const SB_URL = process.env.INTEGRATION_SUPABASE_URL;
const SB_SERVICE = process.env.INTEGRATION_SERVICE_ROLE_KEY;
const STAFF_EMAIL = process.env.INTEGRATION_STAFF_EMAIL;
const STAFF_PASSWORD = process.env.INTEGRATION_STAFF_PASSWORD;
const CAND_CODE = process.env.INTEGRATION_CANDIDATE_CODE;
const TEST_ID = process.env.INTEGRATION_TEST_ID;

const hasRuntime =
  BASE && SB_URL && SB_SERVICE && STAFF_EMAIL && STAFF_PASSWORD && CAND_CODE && TEST_ID;
const runtime = hasRuntime ? describe : describe.skip;

async function rpc(name: string, data: Record<string, unknown>, token?: string) {
  return fetch(`${BASE}/_serverFn/${name}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ data }),
  });
}

runtime("audit logging — end-to-end (env-gated)", () => {
  it("logStaffAccess persists an audit_logs row per admin area visit", async () => {
    // Sign the staff user in via Supabase Auth to obtain a bearer token,
    // which the server-fn middleware requires.
    const authClient = createClient(SB_URL!, SB_SERVICE!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Use the admin API to mint a session token via password grant is not
    // available with service role; sign in against Supabase Auth REST.
    const signIn = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: SB_SERVICE! },
      body: JSON.stringify({ email: STAFF_EMAIL, password: STAFF_PASSWORD }),
    });
    expect(signIn.ok, `staff sign-in failed: ${signIn.status}`).toBe(true);
    const { access_token } = (await signIn.json()) as { access_token: string };

    const area = `it-${Math.random().toString(36).slice(2, 8)}`;
    const before = new Date().toISOString();

    const res = await rpc("logStaffAccess", { area }, access_token);
    expect(res.status, `logStaffAccess failed: ${res.status}`).toBe(200);

    // Read the row back via service role.
    const admin = createClient(SB_URL!, SB_SERVICE!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Small retry loop — audit insert is fire-and-forget.
    let row: any = null;
    for (let i = 0; i < 5 && !row; i++) {
      const { data } = await admin
        .from("audit_logs")
        .select("*")
        .eq("action", "admin.access")
        .gte("created_at", before)
        .contains("metadata", { area })
        .order("created_at", { ascending: false })
        .limit(1);
      row = data?.[0] ?? null;
      if (!row) await new Promise((r) => setTimeout(r, 400));
    }
    expect(row, `no audit_logs row for area=${area}`).toBeTruthy();
    expect(row.actor_type).toBe("staff");
    expect(row.target_type).toBe("area");
    expect(row.metadata?.area).toBe(area);
    expect(new Date(row.created_at).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime() - 1000);
    expect(row.actor_id).toBeTruthy(); // staff user id
  }, 30_000);

  it("candidateSubmitTest persists an audit_logs row with matching attempt/test metadata", async () => {
    const before = new Date().toISOString();
    // Start the attempt
    const start = await rpc("candidateStartTest", { code: CAND_CODE, test_id: TEST_ID });
    expect(start.ok, `start failed: ${start.status}`).toBe(true);
    const startBody = (await start.json()) as any;
    const attemptId: string = startBody.attempt.id;
    const testType: string = startBody.test.test_type;
    const questions: any[] = startBody.questions ?? [];
    expect(attemptId).toBeTruthy();

    // Build deterministic answers.
    const answers =
      testType === "disc"
        ? questions.map((q) => ({ question_id: q.id, answer: JSON.stringify({ most: "D", least: "C" }) }))
        : questions.map((q) => ({
            question_id: q.id,
            answer: String(q.options?.[0]?.value ?? q.options?.[0] ?? "A"),
          }));

    // Reset the attempt status so the submit is accepted even if the
    // fixture attempt was previously finished. Uses service role.
    const admin = createClient(SB_URL!, SB_SERVICE!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await admin
      .from("test_attempts")
      .update({ status: "in_progress", finished_at: null, score: null, result: null })
      .eq("id", attemptId);

    const submit = await rpc("candidateSubmitTest", {
      code: CAND_CODE,
      attempt_id: attemptId,
      answers,
    });
    expect(submit.status, `submit failed: ${submit.status}`).toBe(200);
    const submitBody = (await submit.json()) as any;

    let row: any = null;
    for (let i = 0; i < 5 && !row; i++) {
      const { data } = await admin
        .from("audit_logs")
        .select("*")
        .eq("action", "attempt.submit")
        .eq("target_id", attemptId)
        .gte("created_at", before)
        .order("created_at", { ascending: false })
        .limit(1);
      row = data?.[0] ?? null;
      if (!row) await new Promise((r) => setTimeout(r, 400));
    }
    expect(row, `no audit_logs row for attempt ${attemptId}`).toBeTruthy();
    expect(row.actor_type).toBe("candidate");
    expect(row.actor_id).toBeNull();
    expect(row.target_type).toBe("test_attempt");
    expect(row.target_id).toBe(attemptId);
    expect(typeof row.actor_label).toBe("string");
    expect(row.actor_label.length).toBeGreaterThan(0);
    expect(row.metadata?.test_id).toBe(TEST_ID);
    expect(row.metadata?.score).toBe(submitBody.score);
    expect(row.metadata?.finished_at).toBeTruthy();
    // Audit timestamp is not older than the moment we started
    expect(new Date(row.created_at).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime() - 1000);
  }, 45_000);
});
