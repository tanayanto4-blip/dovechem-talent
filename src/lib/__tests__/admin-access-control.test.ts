import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Security regression test — role enforcement on staff/admin RPCs.
 *
 * A candidate authenticates via a shared access code, NOT via Supabase
 * Auth, so their browser has no bearer token and cannot reach any
 * `createServerFn` guarded by `requireSupabaseAuth`. Even if a candidate
 * somehow obtained a signed-in session (e.g. a public sign-up leak), the
 * staff/admin functions must additionally verify the `admin`/`hr` role
 * via `requireStaff` / `requireAdmin` before touching the service-role
 * client.
 *
 * We enforce this statically:
 *   1. Every exported server function in admin.functions.ts declares
 *      `.middleware([requireStaff])` or `.middleware([requireAdmin])`,
 *      except the two documented bootstrap fns.
 *   2. Every exported server function in users.functions.ts uses
 *      `requireAdmin`, except the two documented bootstrap fns.
 *   3. `getAttemptDetail` — which returns the answer key to staff — is
 *      guarded by `requireStaff` and never re-exported from candidate
 *      modules.
 *   4. `candidate.functions.ts` does not import any admin function or
 *      the staff middleware, so a candidate RPC cannot borrow a staff
 *      code path.
 *   5. `requireStaff` throws `Forbidden` when the caller's user_roles
 *      row does not include admin/hr — asserted by running its server
 *      body against a fake Supabase context.
 */

const here = dirname(fileURLToPath(import.meta.url));
const adminSrc = readFileSync(resolve(here, "../admin.functions.ts"), "utf8");
const usersSrc = readFileSync(resolve(here, "../users.functions.ts"), "utf8");
const candidateSrc = readFileSync(resolve(here, "../candidate.functions.ts"), "utf8");
const middlewareSrc = readFileSync(resolve(here, "../staff-middleware.ts"), "utf8");

/** Extract each `export const <name> = createServerFn(...)....;` block. */
function extractServerFns(src: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  const re = /export const (\w+)\s*=\s*createServerFn\s*\(/g;
  const starts: { name: string; index: number }[] = [];
  for (const m of src.matchAll(re)) {
    starts.push({ name: m[1], index: m.index! });
  }
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1].index : src.length;
    out.push({ name: starts[i].name, body: src.slice(starts[i].index, end) });
  }
  return out;
}

// Documented exceptions — bootstrap endpoints that MUST be callable
// before any admin/staff exists in the database.
const ADMIN_BOOTSTRAP = new Set(["claimFirstAdmin", "getMyRoles"]);
const USERS_BOOTSTRAP = new Set(["bootstrapStatus", "createBootstrapAdmin"]);

describe("staff/admin server fns enforce role checks", () => {
  it("every non-bootstrap fn in admin.functions.ts requires staff or admin", () => {
    const fns = extractServerFns(adminSrc);
    expect(fns.length, "expected to find server fns in admin.functions.ts").toBeGreaterThan(0);
    for (const { name, body } of fns) {
      if (ADMIN_BOOTSTRAP.has(name)) continue;
      const hasStaff = /\.middleware\(\s*\[\s*requireStaff\s*\]\s*\)/.test(body);
      const hasAdmin = /\.middleware\(\s*\[\s*requireAdmin\s*\]\s*\)/.test(body);
      expect(
        hasStaff || hasAdmin,
        `${name} must declare .middleware([requireStaff]) or [requireAdmin]`,
      ).toBe(true);
    }
  });

  it("every non-bootstrap fn in users.functions.ts requires admin", () => {
    const fns = extractServerFns(usersSrc);
    expect(fns.length, "expected to find server fns in users.functions.ts").toBeGreaterThan(0);
    for (const { name, body } of fns) {
      if (USERS_BOOTSTRAP.has(name)) continue;
      expect(
        /\.middleware\(\s*\[\s*requireAdmin\s*\]\s*\)/.test(body),
        `${name} must declare .middleware([requireAdmin])`,
      ).toBe(true);
    }
  });

  it("getAttemptDetail is guarded by requireStaff and not re-exported to candidates", () => {
    const fns = extractServerFns(adminSrc);
    const attempt = fns.find((f) => f.name === "getAttemptDetail");
    expect(attempt, "getAttemptDetail must exist in admin.functions.ts").toBeTruthy();
    expect(
      /\.middleware\(\s*\[\s*requireStaff\s*\]\s*\)/.test(attempt!.body),
      "getAttemptDetail must use requireStaff middleware",
    ).toBe(true);
    expect(
      candidateSrc,
      "candidate.functions.ts must not import getAttemptDetail",
    ).not.toMatch(/getAttemptDetail/);
  });

  it("candidate.functions.ts does not import admin fns or staff middleware", () => {
    expect(candidateSrc).not.toMatch(/from\s+["']@\/lib\/admin\.functions["']/);
    expect(candidateSrc).not.toMatch(/from\s+["']@\/lib\/users\.functions["']/);
    expect(candidateSrc).not.toMatch(/from\s+["']@\/lib\/staff-middleware["']/);
    expect(candidateSrc).not.toMatch(/\brequireStaff\b/);
    expect(candidateSrc).not.toMatch(/\brequireAdmin\b/);
  });

  // Reproduces requireStaff's server body — kept in sync with staff-middleware.ts
  // to allow runtime assertions without evaluating raw TypeScript source.
  async function runRequireStaff(context: { supabase: any; userId: string }, next: (arg: any) => Promise<any>) {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "hr"]);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      throw new Error("Forbidden: hanya staff (admin/hr) yang boleh mengakses.");
    }
    const roles = data.map((r: { role: string }) => r.role);
    return next({ context: { roles, isAdmin: roles.includes("admin") } });
  }

  it("staff middleware source and test replica stay in sync", () => {
    // Guardrail: if someone edits staff-middleware.ts, they must also
    // update the runRequireStaff replica above so behavioural tests
    // still reflect production logic.
    for (const marker of [
      `.from("user_roles")`,
      `.select("role")`,
      `.eq("user_id"`,
      `.in("role", ["admin", "hr"])`,
      `"Forbidden: hanya staff (admin/hr)`,
      `isAdmin: roles.includes("admin")`,
    ]) {
      expect(middlewareSrc, `staff-middleware.ts must still contain: ${marker}`).toContain(marker);
    }
  });

  it("rejects a caller whose user_roles row has no admin/hr entry (candidate scenario)", async () => {
    const fakeSb = {
      from: () => ({
        select: () => ({
          eq: () => ({ in: async () => ({ data: [], error: null }) }),
        }),
      }),
    };
    await expect(
      runRequireStaff({ supabase: fakeSb, userId: "candidate-user-id" }, async () => ({ ok: true })),
    ).rejects.toThrow(/Forbidden/);
  });

  it("propagates DB errors as Error (does not silently allow through)", async () => {
    const fakeSb = {
      from: () => ({
        select: () => ({
          eq: () => ({ in: async () => ({ data: null, error: { message: "db down" } }) }),
        }),
      }),
    };
    await expect(
      runRequireStaff({ supabase: fakeSb, userId: "x" }, async () => ({ ok: true })),
    ).rejects.toThrow(/db down/);
  });

  it("allows staff and marks admin correctly", async () => {
    const fakeSb = {
      from: () => ({
        select: () => ({
          eq: () => ({ in: async () => ({ data: [{ role: "admin" }], error: null }) }),
        }),
      }),
    };
    let captured: any = null;
    const res = await runRequireStaff({ supabase: fakeSb, userId: "admin-id" }, async (arg) => {
      captured = arg?.context ?? null;
      return { ok: true };
    });
    expect(res).toEqual({ ok: true });
    expect(captured?.isAdmin).toBe(true);
    expect(captured?.roles).toEqual(["admin"]);
  });
});
