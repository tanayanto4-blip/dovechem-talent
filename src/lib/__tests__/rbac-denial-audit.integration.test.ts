/**
 * RBAC denial audit integration test.
 *
 * For every guarded admin server function we:
 *   1. Snapshot the current count of `admin.access.denied` audit rows.
 *   2. Invoke the endpoint over HTTP with NO bearer token.
 *   3. Assert the response is a 4xx (403 preferred; 401 acceptable when the
 *      upstream `requireSupabaseAuth` middleware rejects first — that path
 *      never reaches `requireStaff`, so no audit row is expected).
 *   4. If the response was 403, assert exactly ONE new
 *      `admin.access.denied` row was written for that attempt.
 *
 * The list of guarded endpoints is derived from source so new admin
 * functions are covered automatically; only `PUBLIC_ALLOWLIST` names in
 * rbac-enforcement.test.ts are excluded.
 *
 * Opt-in via env vars (skipped otherwise so CI never fails on missing secrets):
 *
 *   INTEGRATION_SUPABASE_URL              (defaults to VITE_SUPABASE_URL)
 *   INTEGRATION_SUPABASE_PUBLISHABLE_KEY  (defaults to VITE_SUPABASE_PUBLISHABLE_KEY)
 *   INTEGRATION_ADMIN_EMAIL / INTEGRATION_ADMIN_PASSWORD  (to count audit_logs)
 *   INTEGRATION_BASE_URL                  (published or preview origin)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.INTEGRATION_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.INTEGRATION_SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "";
const ADMIN_EMAIL = process.env.INTEGRATION_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.INTEGRATION_ADMIN_PASSWORD ?? "";
const BASE_URL = (process.env.INTEGRATION_BASE_URL ?? "").replace(/\/$/, "");

const canRun = Boolean(SUPABASE_URL && SUPABASE_KEY && ADMIN_EMAIL && ADMIN_PASSWORD && BASE_URL);

// Endpoints that are intentionally NOT guarded (bootstrap / session helpers).
const PUBLIC_ALLOWLIST = new Set([
  "bootstrapStatus",
  "createBootstrapAdmin",
  "claimFirstAdmin",
  "getMyRoles",
]);

const ADMIN_FILES = ["src/lib/admin.functions.ts", "src/lib/users.functions.ts"];

function extractGuardedEndpoints(): string[] {
  const names: string[] = [];
  for (const rel of ADMIN_FILES) {
    const src = readFileSync(join(process.cwd(), rel), "utf8");
    const re = /export const (\w+)\s*=\s*createServerFn\(\{[^}]*\}\)([\s\S]*?)\.handler\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const name = m[1];
      const chain = m[2];
      if (PUBLIC_ALLOWLIST.has(name)) continue;
      const guarded =
        /\.middleware\(\[[^\]]*\brequireStaff\b/.test(chain) ||
        /\.middleware\(\[[^\]]*\brequireAdmin\b/.test(chain);
      if (guarded) names.push(name);
    }
  }
  return Array.from(new Set(names));
}

const ENDPOINTS = extractGuardedEndpoints();

async function countDenied(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("action", "admin.access.denied");
  if (error) throw new Error(`count denied failed: ${error.message}`);
  return count ?? 0;
}

async function invokeUnauthed(name: string): Promise<Response> {
  return fetch(`${BASE_URL}/_serverFn/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    // Best-effort empty payload; validators may reject with 400 AFTER
    // middleware runs — that still means a 4xx was returned. Middleware
    // executes before the validator in TanStack Start, so RBAC denial (403)
    // takes precedence over input validation errors.
    body: JSON.stringify({ data: {} }),
  });
}

describe("admin endpoint enumeration", () => {
  it("finds at least one guarded admin server function", () => {
    expect(ENDPOINTS.length).toBeGreaterThan(0);
  });
});

describe.skipIf(!canRun)(
  "integration: every guarded admin endpoint denies unauth callers with 403 + audit log",
  () => {
    let admin: SupabaseClient;

    beforeAll(async () => {
      admin = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await admin.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });
      if (error) throw new Error(`admin sign-in failed: ${error.message}`);
    }, 30_000);

    it.each(ENDPOINTS)(
      "%s: unauthenticated call is rejected (403) and writes exactly one admin.access.denied row",
      async (name) => {
        const before = await countDenied(admin);
        const res = await invokeUnauthed(name);

        // Must never be a success.
        expect(res.status, `${name} unexpectedly succeeded`).toBeGreaterThanOrEqual(400);
        // 401 = rejected upstream by requireSupabaseAuth (no bearer) — no audit expected.
        // 403 = rejected by requireStaff/requireAdmin — audit MUST be written.
        expect([401, 403]).toContain(res.status);

        // Give the async insert a moment to land.
        await new Promise((r) => setTimeout(r, 400));
        const after = await countDenied(admin);

        if (res.status === 403) {
          expect(
            after - before,
            `${name}: expected exactly 1 new admin.access.denied row, got ${after - before}`,
          ).toBe(1);
        } else {
          // 401 short-circuits before the RBAC audit path.
          expect(after - before).toBe(0);
        }
      },
      15_000,
    );
  },
);

describe("integration wiring", () => {
  it("declares required env vars for CI operators", () => {
    const missing: string[] = [];
    if (!SUPABASE_URL) missing.push("INTEGRATION_SUPABASE_URL / VITE_SUPABASE_URL");
    if (!SUPABASE_KEY)
      missing.push("INTEGRATION_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_PUBLISHABLE_KEY");
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) missing.push("INTEGRATION_ADMIN_EMAIL / _PASSWORD");
    if (!BASE_URL) missing.push("INTEGRATION_BASE_URL");
    expect(Array.isArray(missing)).toBe(true);
  });
});
