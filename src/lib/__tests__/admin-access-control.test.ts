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

  it("requireStaff middleware source rejects callers without admin/hr role", async () => {
    // Extract the async server callback body and evaluate it against a
    // fake Supabase context that returns an empty user_roles list.
    // The callback should throw "Forbidden".
    const match = middlewareSrc.match(
      /requireStaff[\s\S]*?\.server\(\s*async\s*\(\s*\{\s*next,\s*context\s*\}\s*\)\s*=>\s*\{([\s\S]*?)\n\s*\}\s*\)\s*;/,
    );
    expect(match, "could not locate requireStaff.server body").toBeTruthy();
    const body = match![1];

    const fakeSb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            in: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    };
    const context = { supabase: fakeSb, userId: "candidate-user-id" };
    const next = async () => ({ ok: true });

    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function("context", "next", `return (async () => {${body}})();`);
    await expect(fn(context, next)).rejects.toThrow(/Forbidden/);
  });

  it("requireStaff middleware source passes callers WITH admin role", async () => {
    const match = middlewareSrc.match(
      /requireStaff[\s\S]*?\.server\(\s*async\s*\(\s*\{\s*next,\s*context\s*\}\s*\)\s*=>\s*\{([\s\S]*?)\n\s*\}\s*\)\s*;/,
    );
    const body = match![1];
    const fakeSb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            in: async () => ({ data: [{ role: "admin" }], error: null }),
          }),
        }),
      }),
    };
    const context = { supabase: fakeSb, userId: "admin-user-id" };
    let capturedCtx: any = null;
    const next = async (arg: any) => {
      capturedCtx = arg?.context ?? null;
      return { ok: true };
    };
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function("context", "next", `return (async () => {${body}})();`);
    await expect(fn(context, next)).resolves.toEqual({ ok: true });
    expect(capturedCtx?.isAdmin).toBe(true);
    expect(capturedCtx?.roles).toEqual(["admin"]);
  });
});
