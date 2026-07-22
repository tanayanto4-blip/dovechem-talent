import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Consolidated endpoint security regression suite.
 *
 * Two invariants are enforced across every server function:
 *   1. Role enforcement — every admin/staff endpoint declares
 *      `.middleware([requireStaff|requireAdmin])`, and candidate
 *      endpoints never borrow that middleware or import an admin fn.
 *   2. No sensitive-field leaks — no handler returns known-sensitive
 *      column names (auth password hashes, service-role keys, DB
 *      passwords) or projects `*` from tables that contain answer
 *      keys / auth material.
 *
 * These checks are static (source scans) so they run in CI without
 * touching Supabase.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(resolve(here, p), "utf8");

const adminSrc = read("../admin.functions.ts");
const usersSrc = read("../users.functions.ts");
const candidateSrc = read("../candidate.functions.ts");

const ADMIN_BOOTSTRAP = new Set(["claimFirstAdmin", "getMyRoles"]);
const USERS_BOOTSTRAP = new Set(["bootstrapStatus", "createBootstrapAdmin"]);

/** Extract `export const <name> = createServerFn(...)....` blocks. */
function extractServerFns(src: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  const starts: { name: string; index: number }[] = [];
  for (const m of src.matchAll(/export const (\w+)\s*=\s*createServerFn\s*\(/g)) {
    starts.push({ name: m[1], index: m.index! });
  }
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1].index : src.length;
    out.push({ name: starts[i].name, body: src.slice(starts[i].index, end) });
  }
  return out;
}

/** Fields we must never send to the browser from any handler. */
const SENSITIVE_TOKENS = [
  "encrypted_password",
  "password_hash",
  "hashed_password",
  "service_role_key",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL",
];

/**
 * Handlers that legitimately `.select("*")` a sensitive table server-side
 * and DO NOT return those rows to the browser. `candidateSubmitTest` reads
 * `test_questions.*` to score against `correct_answer` but only returns an
 * aggregate `{score, result}`. `listAdminUsers` / `createAdminUser` read
 * `user_roles.*` under `requireAdmin` and return only whitelisted fields.
 */
const STAR_SELECT_EXEMPT_FNS = new Set([
  "candidateSubmitTest",
  "listAdminUsers",
  "createAdminUser",
  "createBootstrapAdmin",
]);
const NO_STAR_SELECT_TABLES = ["test_questions", "user_roles"];

describe("endpoint security — role enforcement", () => {
  it("admin.functions.ts: every non-bootstrap fn requires staff or admin", () => {
    const fns = extractServerFns(adminSrc);
    expect(fns.length).toBeGreaterThan(0);
    for (const { name, body } of fns) {
      if (ADMIN_BOOTSTRAP.has(name)) continue;
      const guarded =
        /\.middleware\(\s*\[\s*requireStaff\s*\]\s*\)/.test(body) ||
        /\.middleware\(\s*\[\s*requireAdmin\s*\]\s*\)/.test(body);
      expect(guarded, `${name} must declare requireStaff or requireAdmin`).toBe(true);
    }
  });

  it("users.functions.ts: every non-bootstrap fn requires admin", () => {
    const fns = extractServerFns(usersSrc);
    expect(fns.length).toBeGreaterThan(0);
    for (const { name, body } of fns) {
      if (USERS_BOOTSTRAP.has(name)) continue;
      expect(
        /\.middleware\(\s*\[\s*requireAdmin\s*\]\s*\)/.test(body),
        `${name} must declare requireAdmin`,
      ).toBe(true);
    }
  });

  it("candidate.functions.ts never imports admin/staff modules", () => {
    expect(candidateSrc).not.toMatch(/from\s+["']@\/lib\/admin\.functions["']/);
    expect(candidateSrc).not.toMatch(/from\s+["']@\/lib\/users\.functions["']/);
    expect(candidateSrc).not.toMatch(/from\s+["']@\/lib\/staff-middleware["']/);
    expect(candidateSrc).not.toMatch(/\brequireStaff\b/);
    expect(candidateSrc).not.toMatch(/\brequireAdmin\b/);
  });

  it("candidate.functions.ts never re-exports admin-only helpers", () => {
    for (const forbidden of [
      "getAttemptDetail",
      "listAdminUsers",
      "resetUserPassword",
      "deleteAdminUser",
      "createAdminUser",
      "listAuditLogs",
    ]) {
      expect(
        candidateSrc,
        `candidate module must not reference ${forbidden}`,
      ).not.toMatch(new RegExp(`\\b${forbidden}\\b`));
    }
  });
});

describe("endpoint security — no sensitive-field leaks", () => {
  const modules = [
    { name: "admin.functions.ts", src: adminSrc },
    { name: "users.functions.ts", src: usersSrc },
    { name: "candidate.functions.ts", src: candidateSrc },
  ];

  for (const { name, src } of modules) {
    it(`${name}: no handler mentions known sensitive columns`, () => {
      for (const token of SENSITIVE_TOKENS) {
        expect(src, `${name} must not reference "${token}"`).not.toContain(token);
      }
    });

    it(`${name}: no .select("*") from answer-key or role tables`, () => {
      for (const table of NO_STAR_SELECT_TABLES) {
        const re = new RegExp(
          `\\.from\\(\\s*["\`']${table}["\`']\\s*\\)[\\s\\S]{0,200}?\\.select\\(\\s*["\`']\\*["\`']`,
          "g",
        );
        expect(
          src.match(re),
          `${name} must not .select("*") from ${table}`,
        ).toBeNull();
      }
    });
  }

  it("candidate handlers that return question rows never project correct_answer", () => {
    const fns = extractServerFns(candidateSrc);
    const clientFacing = ["candidateStartTest", "candidateGetAttempt"];
    for (const name of clientFacing) {
      const fn = fns.find((f) => f.name === name);
      expect(fn, `expected ${name} in candidate module`).toBeTruthy();
      const selects = [
        ...fn!.body.matchAll(
          /\.from\(\s*["'`]test_questions["'`]\s*\)[\s\S]{0,200}?\.select\(\s*(["'`])([\s\S]*?)\1\s*\)/g,
        ),
      ];
      expect(selects.length, `${name}: expected an explicit projection`).toBeGreaterThan(0);
      for (const m of selects) {
        const projection = m[2].trim();
        expect(projection, `${name}: '*' projection forbidden`).not.toBe("*");
        expect(projection, `${name}: correct_answer forbidden`).not.toMatch(/\bcorrect_answer\b/);
      }
    }
  });

  it("candidateSubmitTest reads the answer key server-side but never returns it", () => {
    const fn = extractServerFns(candidateSrc).find((f) => f.name === "candidateSubmitTest");
    expect(fn).toBeTruthy();
    const returns = [...fn!.body.matchAll(/return\s+([\s\S]*?);/g)].map((m) => m[1]);
    for (const r of returns) {
      expect(r, "candidateSubmitTest return must not include correct_answer").not.toMatch(
        /\bcorrect_answer\b/,
      );
    }
  });

  it("listAdminUsers returns only whitelisted user fields (no auth internals)", () => {
    const fn = extractServerFns(usersSrc).find((f) => f.name === "listAdminUsers");
    expect(fn).toBeTruthy();
    // The mapped shape must contain only the fields we've vetted.
    for (const forbidden of [
      "encrypted_password",
      "confirmation_token",
      "recovery_token",
      "email_change_token",
      "raw_app_meta_data",
      "raw_user_meta_data",
      "phone_confirm",
      "banned_until",
    ]) {
      expect(fn!.body, `listAdminUsers must not expose ${forbidden}`).not.toContain(forbidden);
    }
  });
});
